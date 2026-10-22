import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

/** `E2E_PORT` lets a local run avoid a dev server already on 4200. */
const WEB_PORT = Number(process.env['E2E_PORT'] ?? 4200);
const OIDC_PORT = Number(process.env['E2E_OIDC_PORT'] ?? 4387);
const baseURL = process.env['BASE_URL'] ?? `http://localhost:${WEB_PORT}`;
const isCI = Boolean(process.env['CI']);

/**
 * Sign-in runs against `E2E_OIDC_ISSUER` (e.g. the local Keycloak realm) when
 * set, otherwise against the bundled test issuer. The API stays mocked in
 * the browser; only the web server talks to the issuer.
 */
const externalIssuer = process.env['E2E_OIDC_ISSUER'];
const issuer = externalIssuer ?? `http://127.0.0.1:${OIDC_PORT}`;

const testIssuer = {
  command: `node --experimental-strip-types --no-warnings apps/web-e2e/src/support/oidc-provider.ts`,
  url: `${issuer}/.well-known/openid-configuration`,
  reuseExistingServer: false,
  cwd: workspaceRoot,
  env: { E2E_OIDC_PORT: String(OIDC_PORT) },
};

const webServer = {
  command: `pnpm exec nx run web:start --port=${WEB_PORT}`,
  url: baseURL,
  reuseExistingServer: false,
  cwd: workspaceRoot,
  timeout: 180_000,
  env: {
    OIDC_ISSUER_URL: issuer,
    OIDC_WEB_CLIENT_ID: 'matchiq-web',
    WEB_PUBLIC_URL: baseURL,
    WEB_SESSION_SECRET: 'e2e-only-session-secret-not-for-production',
    API_INTERNAL_BASE_URL: 'http://127.0.0.1:9/api/v1',
  },
};

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  use: { baseURL, trace: 'on-first-retry' },
  webServer: process.env['BASE_URL']
    ? undefined
    : externalIssuer
      ? [webServer]
      : [testIssuer, webServer],
  /** Every spec runs in both themes, on desktop and mobile. */
  projects: (['dark', 'light'] as const).flatMap((colorScheme) => [
    {
      name: `desktop-${colorScheme}`,
      use: { ...devices['Desktop Chrome'], colorScheme },
    },
    {
      name: `mobile-${colorScheme}`,
      use: { ...devices['Pixel 7'], colorScheme },
    },
  ]),
});
