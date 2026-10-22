# Installable web app (PWA)

MatchIQ's web app installs to a phone home screen or desktop and opens full screen, without an app store. A native app is deferred. All match data stays synthetic, and the synthetic-data notice stays visible in the installed app and on the offline page.

## What ships

| Piece            | Location                                                                | Notes                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Manifest         | `apps/web/src/app/manifest.ts` → `/manifest.webmanifest`                | Next.js metadata route. `display: standalone`, `start_url: /fixtures`, `scope: /`, dark canvas `#07090d`, a "Fixture lobby" shortcut |
| Icons            | `apps/web/public/icons/*`, `apps/web/public/favicon.ico`                | 192 and 512 PNG, maskable 512 (mark inside the 80% safe zone), apple-touch-icon 180, SVG, favicon (16/32/48)                         |
| Icon generator   | `pnpm --filter @matchiq/web icons:generate`                             | Renders the `LogoMark` component and rasterises it with Playwright's Chromium. No extra dependency. Commit the outputs               |
| Service worker   | `apps/web/public/sw.js`                                                 | Hand-written, no library. Served with `Cache-Control: no-cache, no-store, must-revalidate` (`next.config.js`)                        |
| Registration, UI | `apps/web/src/lib/pwa/*`, `apps/web/src/components/pwa/pwa-prompts.tsx` | Production builds only (`PWA_ENABLED` in `constants/pwa.ts`). "Update available — Reload" toast, "Install app" button, iOS guidance  |
| Offline fallback | `apps/web/src/app/offline/page.tsx` → `/offline`                        | Static page, precached with its CSS, JS and fonts                                                                                    |
| Metadata         | `apps/web/src/app/layout.tsx`                                           | `theme-color` for dark and light schemes, `apple-touch-icon`, `apple-mobile-web-app-*`                                               |

## Caching strategy

| Request                                                                      | Strategy                                       | Why                                                               |
| ---------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Any other origin, including the API (`NEXT_PUBLIC_API_BASE_URL`)             | Network only (the worker does not intercept)   | Match state, insights and overlays must be live and authoritative |
| Any path containing `/stream`, any `/api/` path, `Accept: text/event-stream` | Network only                                   | The SSE stream must never be buffered or replayed                 |
| Non-GET requests                                                             | Network only                                   | Commands (start, pause, seek) are never cached or queued          |
| Page navigations                                                             | Network only; offline falls back to `/offline` | Pages render live data, so a stale page would mislead             |
| `/_next/static/*`                                                            | Stale-while-revalidate, capped at 200 entries  | Content-hashed and immutable                                      |
| `/offline`, manifest, favicon, two icons                                     | Precached on install; network first afterwards | The app shell needed to render the offline page                   |

Cache names carry a version (`matchiq-shell-v1`, `matchiq-static-v1`). On activate, the worker deletes every `matchiq-*` cache without the current version. Bump `CACHE_VERSION` in `sw.js` when its caching behaviour changes.

### Updates

The browser re-checks `/sw.js` on navigation, and the app also checks when it becomes visible again. A new worker installs and then **waits**; it never takes over an open page by itself. The page shows "Update available" with a Reload button. Reload tells the waiting worker to activate and reloads once it controls the page. Closing every MatchIQ tab or window also activates it.

## Installing

HTTPS is required, except on `localhost`. Install a production build (`pnpm nx run web:build && pnpm nx run web:start`, or the Docker image); `next dev` does not register the worker.

| Platform                                          | Steps                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Android (Chrome, Edge, Samsung)                   | Open the site. Tap **Install app** at the bottom of the page, or browser menu → **Install app** / **Add to Home screen** |
| iOS and iPadOS (Safari, 16.4+ for other browsers) | Tap **Share** → **Add to Home Screen** → **Add**. The page shows this hint, because iOS has no install prompt API        |
| Desktop (Chrome, Edge)                            | Click **Install app** at the bottom of the page, or the install icon in the address bar                                  |
| Desktop Safari (macOS 14+)                        | **File** → **Add to Dock**                                                                                               |
| Firefox                                           | Android: menu → **Install**. Desktop install support is limited and varies by version                                    |

The installed app opens at the fixture lobby. Dismissing the install suggestion hides it on that browser (stored in `localStorage`).

## Offline behaviour

- Opening or reloading any page offline shows the offline page: synthetic-data notice, "You're offline — live match data needs a connection" and a **Try again** link that retries the same URL.
- No match data is available offline. Nothing from the API is cached, so reconnecting always shows current state.
- An open studio that loses its connection keeps its existing reconnect behaviour (Reconnecting, then Live). The worker does not change it.

## Caveats

- **HTTPS only.** Browsers register service workers only on secure origins; `http://localhost` is the exception.
- **iOS**: no `beforeinstallprompt`, so installation is manual. Each home-screen app has its own storage, separate from Safari. iOS can still clear caches under storage pressure; the next online launch re-installs the shell. `theme-color` support is partial.
- **API origin**: the API is called cross-origin, so it needs CORS for the web origin as it does in the browser today. The worker adds no requirements.
- **First visit**: the offline page is available only after one online visit has installed the worker.
- **Hosting**: the API, not the web app, must stay reachable for live data. Static hosting of the web app alone is not enough.

## Tests

- Vitest: `src/lib/pwa/service-worker.spec.ts` (registration, update detection, skip-waiting and reload), `src/lib/pwa/use-install-prompt.spec.ts` (Chromium prompt, iOS hint, dismissal, standalone), `src/components/pwa/pwa-prompts.spec.tsx`, `src/app/manifest.spec.ts`.
- Playwright, against a production build: `apps/web-e2e/src/pwa.spec.ts` checks the manifest and icon sizes, worker headers and control, that API responses never come from or enter the cache, and the offline fallback with axe.
