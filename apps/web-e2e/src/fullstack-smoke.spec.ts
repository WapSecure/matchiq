import { expect, test } from '@playwright/test';
import { expectNoBlockingA11yViolations } from './support/a11y';

/**
 * Browser-level smoke against the Compose app profile: no mocks, no route
 * interception. Run with BASE_URL pointing at the served web app.
 */
const REPLAY_TIMEOUT_MS = 6 * 60_000;
const STEP_TIMEOUT_MS = 60_000;
const MOMENT_TIMEOUT_MS = 3 * 60_000;

test.skip(!process.env['BASE_URL'], 'Needs BASE_URL for a running stack');

test('clean run through the real stack, in the browser', async ({ page }) => {
  test.setTimeout(REPLAY_TIMEOUT_MS + 3 * 60_000);

  await page.goto('/fixtures');
  const card = page
    .getByRole('article')
    .filter({ hasText: 'Late comeback' })
    .first();
  await expect(card).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expectNoBlockingA11yViolations(page);

  await card.getByRole('button', { name: /Replay speed/ }).click();
  await page.getByRole('option', { name: /30×/ }).click();
  await card.getByRole('button', { name: /Start replay/ }).click();
  await expect(page).toHaveURL(/\/studio\/[^/]+$/, {
    timeout: STEP_TIMEOUT_MS,
  });
  const studioUrl = new URL(page.url()).pathname;

  const scoreboard = page.getByRole('region', { name: 'Scoreboard' });
  await expect(scoreboard).toBeVisible({ timeout: STEP_TIMEOUT_MS });
  await expect(page.getByTestId('full-time-callout')).toContainText(
    'Full time',
    { timeout: REPLAY_TIMEOUT_MS },
  );
  await expect(scoreboard).toContainText(/\d/);
  await expectNoBlockingA11yViolations(page);

  const evidence = page
    .getByRole('button', { name: /see the evidence for/i })
    .first();
  await expect(evidence).toBeVisible({ timeout: MOMENT_TIMEOUT_MS });

  const stats = page.getByRole('region', { name: 'Match stats' });
  await expect(stats.getByRole('row', { name: /Shot conversion/ })).toBeVisible(
    { timeout: STEP_TIMEOUT_MS },
  );
  await expect(stats.getByRole('row', { name: /Pass quality/ })).toBeVisible();

  await evidence.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close evidence' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('link', { name: 'Recap' }).click();
  await expect(page).toHaveURL(/\/recap$/);
  await expect(page.getByText('Match story').first()).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(page.getByText('Final stats').first()).toBeVisible();
  await expect(
    page.getByRole('row', { name: /Shot conversion/ }),
  ).toBeVisible();
  await expectNoBlockingA11yViolations(page);

  await page.getByRole('link', { name: 'Fact-checks' }).click();
  await expect(page).toHaveURL(/\/observatory$/);
  await expect(page.getByText('Caught by the fact check')).toBeVisible({
    timeout: STEP_TIMEOUT_MS,
  });
  await expect(page.getByText('Who wrote them')).toBeVisible();

  await page.goto(`${studioUrl}/audit`);
  await expect(page.getByTestId('access-denied')).toContainText(
    "You don't have access to this",
    { timeout: STEP_TIMEOUT_MS },
  );
});
