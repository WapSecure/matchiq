import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const SINGLE_LINE_MAX_PX = 24;

test.describe('match lobby', () => {
  test('lists templates with the quick-start scenario first, and recent sessions', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    const cards = page
      .getByRole('list', { name: 'Matches' })
      .getByRole('article');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Late comeback');
    await expect(cards.first()).toContainText('Recommended replay');
    await expect(cards.first()).toContainText('Northbridge Athletic');
    await expect(cards.first()).toContainText('Simulated match');
    await expect(cards.first()).toContainText('4207');
    await expect(cards.nth(1)).toContainText('High press');
    const sessions = page.getByRole('list', { name: 'Recent replays' });
    await expect(sessions).toContainText('Replay 1 · NBA-HSR · NANA');
    await expect(sessions).toContainText('Playing');
  });

  test('starts a session at the chosen speed and opens its studio', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/fixtures');
    const card = page.getByRole('article').first();
    await card.getByLabel(/Replay speed/).selectOption('30');
    await card.getByRole('button', { name: /Start replay/ }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}$`));
    expect(api.sessionStarts).toEqual([{ speed: 30 }]);
    expect(api.replayCommands).toEqual([]);
    await expect(
      page.getByRole('region', { name: 'Scoreboard' }),
    ).toContainText('Northbridge');
  });

  test('explains a rate-limited start', async ({ page }) => {
    await mockApi(page, { start: 'rateLimited' });
    await page.goto('/fixtures');
    await page
      .getByRole('article')
      .first()
      .getByRole('button', { name: /Start replay/ })
      .click();
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: "You've started a lot of replays" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/fixtures$/);
  });

  test('explains an empty template list', async ({ page }) => {
    await mockApi(page, { templates: 'empty' });
    await page.goto('/fixtures');
    await expect(page.getByText('No matches to replay yet')).toBeVisible();
  });

  test('explains an API failure in plain words, never its raw text', async ({
    page,
  }) => {
    await mockApi(page, { templates: 'error' });
    await page.goto('/fixtures');
    const alert = page
      .getByRole('alert')
      .filter({ hasText: "We couldn't load the matches" });
    await expect(alert).toContainText("We're at capacity", {
      timeout: 15_000,
    });
    await expect(alert).not.toContainText('Template service unavailable');
    await expect(
      alert.getByRole('button', { name: /Try again/ }),
    ).toBeVisible();
  });

  test('has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await expect(page.getByRole('article').first()).toBeVisible();
    await expect(page.getByText('Replay 1 · NBA-HSR · NANA')).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });

  test('does not scroll horizontally', async ({ page }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await expect(page.getByRole('article').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('simulated-data notice bar', () => {
  for (const width of [390, 768, 1440]) {
    test(`keeps the simulated-data badge on one line at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page);
      await page.goto('/fixtures');
      const badge = page
        .getByRole('note')
        .getByText('Simulated match data', { exact: true });
      const box = await badge.boundingBox();
      expect(box?.height ?? 0).toBeLessThan(SINGLE_LINE_MAX_PX);
      await expectNoHorizontalOverflow(page);
    });
  }
});
