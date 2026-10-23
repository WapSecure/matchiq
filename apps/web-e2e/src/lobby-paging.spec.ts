import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';

test.describe('lobby pagination', () => {
  test('pages matches by number and replays by cursor, with shareable URLs and Back', async ({
    page,
  }) => {
    await mockApi(page, { paging: true });
    await page.goto('/fixtures');
    const matches = page.getByRole('list', { name: 'Matches' });
    await expect(matches.getByRole('article')).toHaveCount(6);
    await expect(page.getByText('Showing 1–6 of 8 matches')).toBeVisible();

    const matchPages = page.getByRole('navigation', { name: 'Match pages' });
    await matchPages.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(matches.getByRole('article')).toHaveCount(2);
    await expect(page.getByText('Showing 7–8 of 8 matches')).toBeVisible();

    const replayPages = page.getByRole('navigation', {
      name: 'Recent replay pages',
    });
    await expect(page.getByText('Showing 1–8 of 11 replays')).toBeVisible();
    await replayPages.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/after=after-8/);
    await expect(page.getByText('Showing 9–11 of 11 replays')).toBeVisible();
    await expect(
      replayPages.getByRole('button', { name: 'Next page' }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expectNoBlockingA11yViolations(page);

    await page.goBack();
    await expect(page.getByText('Showing 1–8 of 11 replays')).toBeVisible();
    await page.goBack();
    await expect(page.getByText('Showing 1–6 of 8 matches')).toBeVisible();
  });

  test('opens a shared page directly', async ({ page }) => {
    await mockApi(page, { paging: true });
    await page.goto('/fixtures?page=2&after=after-8');
    await expect(page.getByText('Showing 7–8 of 8 matches')).toBeVisible();
    await expect(page.getByText('Showing 3 of 11 replays')).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Recent replay pages' })
      .getByRole('button', { name: 'Previous page' })
      .click();
    await expect(page.getByText('Showing 1–8 of 11 replays')).toBeVisible();
  });

  test('stays compact on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mockApi(page, { paging: true });
    await page.goto('/fixtures');
    const matchPages = page.getByRole('navigation', { name: 'Match pages' });
    await expect(matchPages.getByText('Page 1 of 2')).toBeVisible();
    await expect(
      matchPages.getByRole('button', { name: 'Page 2' }),
    ).toBeHidden();
    await expectNoHorizontalOverflow(page);
    await expectNoBlockingA11yViolations(page);
  });
});
