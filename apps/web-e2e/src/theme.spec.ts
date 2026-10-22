import { expect, type Page, test } from '@playwright/test';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const STORAGE_KEY = 'matchiq.theme';
const CANVAS = { light: 'rgb(243, 245, 248)', dark: 'rgb(8, 10, 14)' };

const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe('colour theme', () => {
  test('follows the OS preference by default', async ({ page }, info) => {
    await page.goto('/');
    const scheme = info.project.use.colorScheme === 'light' ? 'light' : 'dark';
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    expect(await bodyBackground(page)).toBe(CANVAS[scheme]);
  });

  test('applies a stored choice before first paint', async ({ page }) => {
    await page.addInitScript(
      ([key]) => window.localStorage.setItem(key ?? '', 'light'),
      [STORAGE_KEY],
    );
    await page.emulateMedia({ colorScheme: 'dark' });
    const seen: string[] = [];
    await page.exposeFunction('reportTheme', (t: string) => seen.push(t));
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () =>
        (window as unknown as { reportTheme: (t: string) => void }).reportTheme(
          document.documentElement.getAttribute('data-theme') ?? 'none',
        ),
      );
    });
    await page.goto('/');
    expect(seen).toEqual(['light']);
    expect(await bodyBackground(page)).toBe(CANVAS.light);
  });

  test('persists the toggle across navigation and reloads', async ({
    page,
  }) => {
    await mockApi(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/fixtures');
    const toggle = page.getByTestId('theme-toggle');
    const radio = toggle.getByRole('radio', { name: 'Dark' });
    if (await radio.isVisible()) await radio.check({ force: true });
    else {
      await toggle.getByRole('button', { name: /Switch to Light/ }).click();
      await toggle.getByRole('button', { name: /Switch to Dark/ }).click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await bodyBackground(page)).toBe(CANVAS.dark);
  });

  test('keeps the broadcast preview in on-air colours in light mode', async ({
    page,
  }) => {
    await mockApi(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`/studio/${FIXTURE_ID}`);
    const frame = page.getByRole('group', { name: /Overlay preview/ });
    await expect(frame).toBeVisible();
    const background = await frame.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(background).toBe(CANVAS.dark);
    expect(await bodyBackground(page)).toBe(CANVAS.light);
  });
});
