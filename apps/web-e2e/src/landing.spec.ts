import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('presents the product and the synthetic-data disclosure', async ({
    page,
  }) => {
    await expect(page).toHaveTitle(/MatchIQ/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Synthetic match data');
  });

  test('navigates to the pipeline section', async ({ page }) => {
    await page.getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#pipeline$/);
    await expect(
      page.getByRole('heading', { name: 'Five stages, one source of truth' }),
    ).toBeInViewport();
  });

  test('exposes a keyboard skip link as the first focus stop', async ({
    page,
  }) => {
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Skip to content' }),
    ).toBeFocused();
  });

  test('has no serious or critical accessibility violations', async ({
    page,
  }) => {
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const blocking = violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('does not scroll horizontally', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
