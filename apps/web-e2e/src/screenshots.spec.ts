import { expect, test } from '@playwright/test';
import { FIXTURE_ID } from './support/mock-fixture';
import { mockApi } from './support/mock-api';

const OUT_DIR = '../../docs/screenshots';
const enabled = Boolean(process.env['CAPTURE_SCREENSHOTS']);

/** Opt-in visual capture for PR review: `CAPTURE_SCREENSHOTS=1 pnpm e2e`. */
test.describe('review screenshots', () => {
  test.skip(!enabled, 'set CAPTURE_SCREENSHOTS=1 to capture');
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('lobby', async ({ page }, info) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await expect(page.getByRole('article').first()).toBeVisible();
    await page.screenshot({
      path: `${OUT_DIR}/lobby-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('studio', async ({ page }, info) => {
    await mockApi(page);
    await page.goto(`/studio/${FIXTURE_ID}`);
    await expect(page.getByText('Pressure building on the left')).toBeVisible();
    await page.screenshot({
      path: `${OUT_DIR}/studio-${info.project.name}.png`,
      fullPage: true,
    });
  });

  test('evidence drawer', async ({ page }, info) => {
    await mockApi(page);
    await page.goto(`/studio/${FIXTURE_ID}`);
    await page
      .getByRole('button', { name: /open evidence/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({
      path: `${OUT_DIR}/evidence-${info.project.name}.png`,
    });
  });
});
