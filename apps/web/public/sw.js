/* MatchIQ service worker. Hand-written; see docs/deployment/PWA.md.
 *
 * Bump CACHE_VERSION whenever this file's caching behaviour changes: activate
 * deletes every `matchiq-*` cache that does not carry the current version.
 * Live data is never cached: other origins (the API) and any `/stream` or
 * `/api/` path fall through to the network untouched.
 */
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'matchiq-';
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';
const SHELL_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon.svg',
  '/icons/icon-192.png',
];
/** Hashed build assets are immutable, so the cap only bounds growth across deploys. */
const STATIC_MAX_ENTRIES = 200;
const STATIC_PREFIX = '/_next/static/';
const NETWORK_ONLY_PATHS = [/\/stream(\/|$|\?)/, /^\/api\//];
const NEXT_ASSET_PATTERN = /\/_next\/static\/[^"'\s)]+/g;
const SKIP_WAITING = 'SKIP_WAITING';

/** The offline page's own CSS, JS and font chunks, so it renders styled offline. */
const offlineAssetUrls = (html) => [
  ...new Set(html.match(NEXT_ASSET_PATTERN) ?? []),
];

const precacheShell = async () => {
  const shell = await caches.open(SHELL_CACHE);
  await shell.addAll(SHELL_URLS);
  const offline = await shell.match(OFFLINE_URL);
  if (!offline) return;
  const assets = offlineAssetUrls(await offline.text());
  const statics = await caches.open(STATIC_CACHE);
  await Promise.all(
    assets.map((url) => statics.add(url).catch(() => undefined)),
  );
};

const deleteStaleCaches = async () => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith(CACHE_PREFIX) && !keep.has(name))
      .map((name) => caches.delete(name)),
  );
};

const trimCache = async (cache) => {
  const keys = await cache.keys();
  const excess = keys.length - STATIC_MAX_ENTRIES;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
};

const staleWhileRevalidate = async (event) => {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request).then(async (response) => {
    if (response.ok) {
      await cache.put(event.request, response.clone());
      await trimCache(cache);
    }
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh;
};

/** Network first; the shell cache answers only when the network fails. */
const networkWithShellFallback = async (request, fallback = request) => {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match(fallback)) ?? Response.error();
  }
};

const isNetworkOnly = (request, url) =>
  request.method !== 'GET' ||
  url.origin !== self.location.origin ||
  request.headers.get('accept')?.includes('text/event-stream') ||
  NETWORK_ONLY_PATHS.some((pattern) => pattern.test(url.pathname));

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    deleteStaleCaches().then(async () => {
      // An update only activates after SKIP_WAITING or once every tab has
      // closed, so claiming never swaps a page's worker unasked.
      await self.clients.claim();
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === SKIP_WAITING) self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (isNetworkOnly(request, url)) return;
  // Pages are never cached (they render live data); offline gets the fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkWithShellFallback(request, OFFLINE_URL));
    return;
  }
  if (url.pathname.startsWith(STATIC_PREFIX)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }
  if (SHELL_URLS.includes(url.pathname)) {
    event.respondWith(networkWithShellFallback(request));
  }
});
