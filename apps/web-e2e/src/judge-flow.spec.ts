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
      page.getByRole('status').filter({ hasText: 'Stream Live' }),
    ).toBeVisible();
    await expect(page.getByTestId('on-air-meta')).toContainText(
      'Tactical insight',
    );
    await checkScreen(page);

    const trigger = page.getByRole('button', {
      name: /open evidence for northbridge seize control/i,
    });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Triggering events');
    await expect(dialog).toContainText('Ball recovery');
    await checkScreen(page);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();

    const metrics = page.getByRole('region', { name: 'Live metrics' });
    const before = (await metrics.textContent()) ?? '';
    await page.getByRole('radio', { name: 'Casual' }).check({ force: true });
    await expect(page.getByText('Northbridge are on top now')).toBeVisible();
    await page.getByRole('radio', { name: /Français/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Broadcast' }).check({ force: true });
    await expect(page.getByText('Northbridge prend le contrôle')).toBeVisible();
    await expect(
      page.getByRole('group', { name: /1 cue on air/ }),
    ).toContainText('Pressure building on the left');
    await expect(metrics).toHaveText(before);

    await page.getByRole('link', { name: 'Recap' }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}/recap$`));
    await expect(page.getByRole('list', { name: 'Key moments' })).toContainText(
      'Northbridge prend le contrôle',
    );
    await expect(
      page.getByRole('button', { name: 'Export JSON' }),
    ).toBeVisible();
    await checkScreen(page);

    await page.getByRole('link', { name: 'Agent observatory' }).click();
    const traces = page.getByRole('list', { name: 'Insight traces' });
    await expect(traces.getByRole('article')).toHaveCount(2);
    await expect(traces).toContainText('UNSUPPORTED_NUMBER');
    await expect(
      page.locator('[data-provider="template"]').first(),
    ).toBeVisible();
    await expect(page.locator('[data-provider="mock"]').first()).toContainText(
      'Mock',
    );
    await checkScreen(page);
  });

  test('recap explains it is available at full time', async ({ page }) => {
    await mockApi(page, { recap: 'notReady' });
    await page.goto(`/studio/${FIXTURE_ID}/recap`);
    await expect(page.getByText('Recap available at full time')).toBeVisible();
    await checkScreen(page);
  });

  test('recap exports the structured document', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/studio/${FIXTURE_ID}/recap`);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    expect((await download).suggestedFilename()).toBe(
      `matchiq-recap-${FIXTURE_ID}.json`,
    );
  });
});
