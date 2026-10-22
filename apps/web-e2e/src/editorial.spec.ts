import { expect, type Page, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { OVERLAY_ID } from './support/mock-match';

const openStudio = async (page: Page) => {
  const api = await mockApi(page);
  await page.goto(`/studio/${FIXTURE_ID}`);
  await expect(
    page.getByText('Pressure building on the left').first(),
  ).toBeVisible();
  return api;
};

const submitReason = async (page: Page, submit: string, reason: string) => {
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason').fill(reason);
  await dialog.getByRole('button', { name: submit, exact: true }).click();
};

const banner = (page: Page) => page.getByTestId('editorial-banner');

test.describe('editorial controls', () => {
  test('freezes auto-publish, shows the banner, then resumes', async ({
    page,
  }) => {
    const api = await openStudio(page);
    await page.getByRole('button', { name: 'Freeze auto-publish' }).click();
    await expect(
      page.getByRole('dialog', {
        name: 'Freeze auto-publish for this session',
      }),
    ).toBeVisible();
    await expectNoBlockingA11yViolations(page);
    await submitReason(page, 'Freeze', 'Goal under VAR review');

    await expect(banner(page)).toContainText('Auto-publish frozen');
    await expect(page.getByTestId('editorial-chip')).toHaveText(/Frozen/);
    await expect(
      page.getByRole('status', { name: 'Editorial notifications' }),
    ).toContainText('Auto-publish frozen');
    expect(api.editorialCommands[0]).toMatchObject({
      path: `/fixtures/${FIXTURE_ID}/editorial/freeze`,
      body: { reason: 'Goal under VAR review' },
    });
    expect(api.editorialCommands[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    await expectNoBlockingA11yViolations(page);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Resume auto-publish' }).click();
    await submitReason(page, 'Resume', 'Review complete');
    await expect(banner(page)).toBeHidden();
  });

  test('retracts the on-air cue from the overlay panel', async ({ page }) => {
    const api = await openStudio(page);
    await page.getByRole('button', { name: /Retract on-air cue/ }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'Pressure building on the left',
    );
    await submitReason(page, 'Retract cue', 'Wrong player credited');
    await expect(
      page.getByRole('group', { name: /standing by/ }),
    ).toBeVisible();
    await expect(page.getByText('Retracted by producer')).toBeVisible();
    expect(api.editorialCommands[0]?.path).toBe(
      `/overlays/${OVERLAY_ID}/retract`,
    );
    await expect(
      page.getByRole('button', { name: /Retract on-air cue/ }),
    ).toBeHidden();
  });

  test('guards the kill switch with a typed confirmation', async ({ page }) => {
    const api = await openStudio(page);
    await page
      .getByRole('button', { name: 'Kill switch', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Feed integrity incident');
    await dialog.getByRole('button', { name: 'Continue' }).click();
    const phrase = dialog.getByLabel('Confirmation');
    await expect(phrase).toBeFocused();
    await phrase.fill('kill');
    await dialog.getByRole('button', { name: 'Activate kill switch' }).click();
    await expect(dialog).toContainText('Type KILL exactly');
    expect(api.editorialCommands).toHaveLength(0);
    await expectNoBlockingA11yViolations(page);

    await phrase.fill('KILL');
    await dialog.getByRole('button', { name: 'Activate kill switch' }).click();
    await expect(banner(page)).toContainText('Kill switch active');
    await expect(
      page.getByRole('button', { name: 'Release kill switch' }),
    ).toBeVisible();
    expect(api.editorialCommands[0]?.path).toBe(
      '/editorial/kill-switch/activate',
    );
  });

  test('lists the audit trail with load more', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/studio/${FIXTURE_ID}/audit`);
    const table = page.getByRole('table', {
      name: /Audit events: 2 shown, more/,
    });
    await expect(table).toBeVisible();
    await expect(table).toContainText('Producer note 1');
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(
      page.getByRole('table', { name: /Audit events: 4 shown/ }),
    ).toBeVisible();
    await expect(page.getByText('End of the audit trail.')).toBeVisible();
    await page.getByText('1 field changed').first().click();
    await expectNoBlockingA11yViolations(page);
    await expectNoHorizontalOverflow(page);
  });
});
