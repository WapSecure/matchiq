import { expect, type Page, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const checkScreen = async (page: Page) => {
  await expectNoBlockingA11yViolations(page);
  await expectNoHorizontalOverflow(page);
};

/** Spec §19 judge quick-start, end to end against a mocked API. */
test.describe('judge quick-start', () => {
  test('lobby → live studio → evidence → audience → overlay → recap → observatory', async ({
    page,
  }) => {
    const api = await mockApi(page);
    await page.goto('/fixtures');
    const card = page.getByRole('article').first();
    await expect(card).toContainText('Late comeback');
    await checkScreen(page);

    await card.getByRole('button', { name: /Start replay/ }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}$`));
    expect(api.sessionStarts).toHaveLength(1);
    await expect(
      page.getByRole('status').filter({ hasText: 'Connection: Live' }),
    ).toBeVisible();
    await expect(page.getByTestId('on-air-meta')).toContainText(
      'Tactical insight',
    );
    await checkScreen(page);

    const trigger = page.getByRole('button', {
      name: /see the evidence for northbridge seize control/i,
    });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('The plays behind it');
    await expect(dialog).toContainText('Ball recovery');
    await checkScreen(page);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();

    const metrics = page.getByRole('region', { name: 'Match stats' });
    const feed = page.getByRole('group', { name: 'Key moments' });
    const before = (await metrics.textContent()) ?? '';
    await page.getByRole('radio', { name: 'Fan' }).check({ force: true });
    await expect(feed.getByText('Northbridge are on top now')).toBeVisible();
    await page.getByRole('radio', { name: /Français/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Broadcast' }).check({ force: true });
    await expect(feed.getByText('Northbridge prend le contrôle')).toBeVisible();
    await expect(
      page.getByRole('group', { name: /1 graphic on air/ }),
    ).toContainText('Pressure building on the left');
    await expect(metrics).toHaveText(before);

    await page.getByRole('link', { name: 'Recap' }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}/recap$`));
    await expect(page.getByRole('list', { name: 'Key moments' })).toContainText(
      'Northbridge prend le contrôle',
    );
    await expect(
      page.getByRole('button', { name: 'Download match report' }),
    ).toBeVisible();
    await checkScreen(page);

    await page.getByRole('link', { name: 'AI fact-checks' }).click();
    const traces = page.getByRole('list', {
      name: 'Key moments and their checks',
    });
    await expect(traces.getByRole('article')).toHaveCount(2);
    await expect(traces).toContainText(
      "A number that doesn't match the match data",
    );
    await expect(
      page.locator('[data-provider="template"]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-provider="mock"]').first()).toContainText(
      'Test stand-in (not real AI)',
    );
    await checkScreen(page);
  });

  test('recap explains it is available at full time', async ({ page }) => {
    await mockApi(page, { recap: 'notReady' });
    await page.goto(`/studio/${FIXTURE_ID}/recap`);
    await expect(
      page.getByText('The recap is ready at full time'),
    ).toBeVisible();
    await checkScreen(page);
  });

  test('recap downloads a match report or the data file', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/studio/${FIXTURE_ID}/recap`);
    const menu = page.getByRole('button', { name: 'Download match report' });
    const data = page.waitForEvent('download');
    await menu.click();
    await page.getByRole('menuitem', { name: /Data file/ }).click();
    expect((await data).suggestedFilename()).toBe(
      'matchiq-recap-NBA-HSR-NANA.json',
    );
    const report = page.waitForEvent('download');
    await menu.click();
    await page.getByRole('menuitem', { name: /Match report/ }).click();
    expect((await report).suggestedFilename()).toBe(
      'matchiq-report-NBA-HSR-NANA.txt',
    );
  });
});
