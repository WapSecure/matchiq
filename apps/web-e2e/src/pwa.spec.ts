import { expect, type Page, test } from '@playwright/test';
import { expectNoBlockingA11yViolations } from './support/a11y';
import { API_BASE, mockApi } from './support/mock-api';

const OFFLINE_TITLE = "You're offline";
const PNG_WIDTH_OFFSET = 16;
const PNG_HEIGHT_OFFSET = 20;

type ManifestIcon = { src: string; sizes: string; type: string };

const waitForControl = async (page: Page) => {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
};

/** Every request URL held in any Cache Storage cache the page can see. */
const cachedUrls = (page: Page) =>
  page.evaluate(async () => {
    const names = await caches.keys();
    const lists = await Promise.all(
      names.map(async (name) => {
        const keys = await (await caches.open(name)).keys();
        return keys.map((request) => request.url);
      }),
    );
    return lists.flat();
  });

test.describe('installable progressive web app', () => {
  test('serves a valid manifest whose icons exist at their declared sizes', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      '/manifest.webmanifest',
    );

    const response = await request.get('/manifest.webmanifest');
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain(
      'application/manifest+json',
    );
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: 'MatchIQ',
      short_name: 'MatchIQ',
      display: 'standalone',
      start_url: '/fixtures',
      scope: '/',
      theme_color: '#080a0e',
      background_color: '#080a0e',
    });
    expect(manifest.shortcuts[0].url).toBe('/fixtures');

    const pngs: ManifestIcon[] = manifest.icons.filter(
      (icon: ManifestIcon) => icon.type === 'image/png',
    );
    expect(pngs.length).toBeGreaterThanOrEqual(3);
    for (const icon of pngs) {
      const image = await request.get(icon.src);
      expect(image.ok(), icon.src).toBe(true);
      const body = await image.body();
      const size = `${body.readUInt32BE(PNG_WIDTH_OFFSET)}x${body.readUInt32BE(PNG_HEIGHT_OFFSET)}`;
      expect(size, icon.src).toBe(icon.sizes);
    }
    const apple = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute('href');
    expect((await request.get(apple ?? '')).ok()).toBe(true);
  });

  test('serves the worker uncached and lets it control the page', async ({
    page,
    request,
  }) => {
    const sw = await request.get('/sw.js');
    expect(sw.headers()['cache-control']).toContain('no-cache');
    expect(sw.headers()['content-type']).toContain('application/javascript');

    await mockApi(page);
    await page.goto('/fixtures');
    await waitForControl(page);
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.ready).scope,
    );
    expect(new URL(scope).pathname).toBe('/');
  });

  test('never serves or stores API and stream responses from the cache', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await waitForControl(page);

    const apiResponses: boolean[] = [];
    page.on('response', (response) => {
      if (response.url().startsWith(API_BASE)) {
        apiResponses.push(response.fromServiceWorker());
      }
    });
    await page.reload();
    await expect(page.getByRole('article').first()).toBeVisible();
    expect(apiResponses.length).toBeGreaterThan(0);
    expect(apiResponses).not.toContain(true);

    const urls = await cachedUrls(page);
    expect(urls.some((url) => url.includes('/_next/static/'))).toBe(true);
    expect(urls.filter((url) => /\/api\/|\/stream/.test(url))).toEqual([]);
    expect(urls.filter((url) => new URL(url).pathname === '/fixtures')).toEqual(
      [],
    );
  });

  test('shows the offline fallback with the synthetic notice when the network is gone', async ({
    page,
    context,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await waitForControl(page);

    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: OFFLINE_TITLE }),
    ).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Synthetic match data');
    await expectNoBlockingA11yViolations(page);
    await context.setOffline(false);
  });
});
