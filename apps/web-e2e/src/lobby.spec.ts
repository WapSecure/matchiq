import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const SINGLE_LINE_MAX_PX = 24;

test.describe('fixture lobby', () => {
  test('lists synthetic fixtures with status and provenance', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    const cards = page
      .getByRole('list', { name: 'Synthetic fixtures' })
      .getByRole('article');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Northbridge Athletic');
    await expect(cards.first()).toContainText('Synthetic match demo');
    await expect(cards.first()).toContainText('late-comeback');
    await expect(cards.nth(1)).toContainText('Scheduled');
  });

  test('starts a replay at the chosen speed and opens the studio', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/fixtures');
    const card = page.getByRole('article').first();
    await card.getByLabel('Replay speed').selectOption('30');
    await card.getByRole('button', { name: 'Start replay' }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}$`));
    expect(api.replayCommands).toEqual([{ action: 'start', speed: 30 }]);
    await expect(
      page.getByRole('region', { name: 'Scoreboard' }),
    ).toContainText('Northbridge');
  });

  test('explains an empty fixture list', async ({ page }) => {
    await mockApi(page, { fixtures: 'empty' });
    await page.goto('/fixtures');
    await expect(page.getByText('No fixtures available')).toBeVisible();
  });

  test('shows problem details when the API fails', async ({ page }) => {
    await mockApi(page, { fixtures: 'error' });
    await page.goto('/fixtures');
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Fixtures could not be loaded' });
    await expect(alert).toContainText('Fixtures could not be loaded', {
      timeout: 15_000,
    });
    await expect(alert).toContainText('Fixture service unavailable');
    await expect(
      alert.getByRole('button', { name: 'Try again' }),
    ).toBeVisible();
  });

  test('has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await expect(page.getByRole('article').first()).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });

  test('does not scroll horizontally', async ({ page }) => {
    await mockApi(page);
    await page.goto('/fixtures');
    await expect(page.getByRole('article').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});

test.describe('synthetic notice bar', () => {
  for (const width of [390, 768, 1440]) {
    test(`keeps the synthetic badge on one line at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockApi(page);
      await page.goto('/fixtures');
      const badge = page
        .getByRole('note')
        .getByText('Synthetic match data', { exact: true });
      const box = await badge.boundingBox();
      expect(box?.height ?? 0).toBeLessThan(SINGLE_LINE_MAX_PX);
      await expectNoHorizontalOverflow(page);
    });
  }
});
