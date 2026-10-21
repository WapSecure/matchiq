import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = 4200;
const baseURL = process.env['BASE_URL'] ?? `http://localhost:${WEB_PORT}`;
const isCI = Boolean(process.env['CI']);

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  use: { baseURL, trace: 'on-first-retry' },
  webServer: process.env['BASE_URL']
    ? undefined
    : {
        command: `pnpm exec nx run web:start --port=${WEB_PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        cwd: workspaceRoot,
        timeout: 180_000,
      },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
});
