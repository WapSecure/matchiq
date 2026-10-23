import type { Metadata, MetadataRoute, Viewport } from 'next';
import { SITE } from './site';
import { DARK_SCHEME_QUERY, LIGHT_SCHEME_QUERY, THEME_CHROME } from './theme';

/**
 * Registration is production-only: `next dev` serves unhashed, constantly
 * changing chunks, and a cached shell would mask hot reloads.
 */
export const PWA_ENABLED = process.env.NODE_ENV === 'production';

/** Must match `public/sw.js` and the `next.config.js` header rule. */
export const SERVICE_WORKER = {
  url: '/sw.js',
  scope: '/',
} as const;

/** Messages exchanged with `public/sw.js`. */
export const SW_MESSAGES = { skipWaiting: 'SKIP_WAITING' } as const;

export const PWA_ROUTES = {
  start: '/fixtures',
  offline: '/offline',
} as const;

/** Browser chrome follows `--color-canvas` in each theme. */
export const PWA_COLORS = {
  dark: THEME_CHROME.dark,
  light: THEME_CHROME.light,
  accent: '#2ccbe8',
} as const;

const ICON_DIR = '/icons';

export const PWA_ICONS = {
  any192: `${ICON_DIR}/icon-192.png`,
  any512: `${ICON_DIR}/icon-512.png`,
  maskable512: `${ICON_DIR}/icon-maskable-512.png`,
  appleTouch: `${ICON_DIR}/apple-touch-icon.png`,
  svg: `${ICON_DIR}/icon.svg`,
} as const;

export const PWA_MANIFEST: MetadataRoute.Manifest = {
  id: '/',
  name: SITE.name,
  short_name: SITE.name,
  description:
    'Football intelligence for live broadcast, demonstrated on synthetic match data: deterministic analytics, evidence-grounded narratives and timed overlays. Fictional teams; not affiliated with the Premier League.',
  start_url: PWA_ROUTES.start,
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  lang: SITE.locale,
  dir: 'ltr',
  background_color: PWA_COLORS.dark,
  theme_color: PWA_COLORS.dark,
  categories: ['sports', 'entertainment', 'productivity'],
  icons: [
    { src: PWA_ICONS.any192, sizes: '192x192', type: 'image/png' },
    { src: PWA_ICONS.any512, sizes: '512x512', type: 'image/png' },
    {
      src: PWA_ICONS.maskable512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    { src: PWA_ICONS.svg, sizes: 'any', type: 'image/svg+xml' },
  ],
  shortcuts: [
    {
      name: 'Fixture lobby',
      short_name: 'Fixtures',
      description: 'Pick a synthetic fixture and start a replay',
      url: PWA_ROUTES.start,
      icons: [{ src: PWA_ICONS.any192, sizes: '192x192', type: 'image/png' }],
    },
  ],
};

export const PWA_METADATA = {
  applicationName: SITE.name,
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: 'black',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: PWA_ICONS.svg, type: 'image/svg+xml' },
    ],
    apple: [{ url: PWA_ICONS.appleTouch, sizes: '180x180' }],
  },
} satisfies Metadata;

export const PWA_THEME_COLOR: Viewport['themeColor'] = [
  { media: DARK_SCHEME_QUERY, color: PWA_COLORS.dark },
  { media: LIGHT_SCHEME_QUERY, color: PWA_COLORS.light },
];

export const PWA_COPY = {
  offline: {
    metaTitle: 'Offline',
    eyebrow: 'Offline',
    title: 'You are offline. Live match data needs a connection.',
    description:
      'MatchIQ streams synthetic match events, metrics and overlays from its API. Reconnect and reload to continue; nothing is replayed from a cache.',
    retry: 'Try again',
  },
  update: {
    message: 'Update available',
    action: 'Reload',
    region: 'App update',
  },
  install: {
    region: 'Install MatchIQ',
    action: 'Install app',
    iosHint: 'Install MatchIQ: tap Share, then Add to Home Screen.',
    dismiss: 'Dismiss install suggestion',
  },
} as const;

/** iPadOS 13+ reports a desktop Mac UA; touch support tells them apart. */
export const IOS_USER_AGENT = /iPad|iPhone|iPod/;
export const MAC_USER_AGENT = /Macintosh/;
export const STANDALONE_QUERY = '(display-mode: standalone)';

export const PWA_STORAGE_KEYS = {
  installDismissed: 'matchiq.pwa.install-dismissed',
} as const;
