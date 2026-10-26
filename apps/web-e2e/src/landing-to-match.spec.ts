import { expect, type Locator, test } from '@playwright/test';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const MAX_CLICKS_EXCLUSIVE = 3;

/** Landing acceptance (§47): an active match is under three clicks from `/`. */
test.describe('landing to an active match', () => {
  test('reaches a started replay in fewer than three clicks', async ({
    page,
  }) => {
    const api = await mockApi(page);
    let clicks = 0;
    const click = async (target: Locator) => {
      await target.click();
      clicks += 1;
    };

    await page.goto('/');
    await click(page.getByRole('link', { name: 'Choose a match' }).first());
    await expect(page).toHaveURL(/\/fixtures$/);
    await click(
      page
        .getByRole('article')
        .first()
        .getByRole('button', { name: /Start replay/ }),
    );

    await expect(page).toHaveURL(new RegExp(`/studio/${FIXTURE_ID}$`));
    await expect(
      page.getByRole('status').filter({ hasText: 'Connection: Live' }),
    ).toBeVisible();
    expect(api.sessionStarts).toHaveLength(1);
    expect(clicks).toBeLessThan(MAX_CLICKS_EXCLUSIVE);
  });
});
