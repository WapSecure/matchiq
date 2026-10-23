import { expect, type Page, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { OVERLAY_ID } from './support/mock-match';
import { signIn } from './support/sign-in';

const STUDIO = `/studio/${FIXTURE_ID}`;

/** Editorial commands need a producer; requests then go through the BFF. */
const openStudio = async (page: Page) => {
  const api = await mockApi(page);
  await signIn(page, 'harbour.producer', STUDIO);
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
  test('pauses graphics, shows the banner, then resumes', async ({ page }) => {
    const api = await openStudio(page);
    await page.getByRole('button', { name: 'Pause graphics' }).click();
    await expect(
      page.getByRole('dialog', {
        name: 'Pause new graphics for this match',
      }),
    ).toBeVisible();
    await expectNoBlockingA11yViolations(page);
    await submitReason(page, 'Pause', 'Goal under VAR review');

    await expect(banner(page)).toContainText('Graphics paused');
    await expect(page.getByTestId('editorial-chip')).toHaveText(
      /Graphics paused/,
    );
    await expect(
      page.getByRole('status', { name: 'Producer notifications' }),
    ).toContainText('Graphics paused');
    expect(api.editorialCommands[0]).toMatchObject({
      path: `/fixtures/${FIXTURE_ID}/editorial/freeze`,
      body: { reason: 'Goal under VAR review' },
    });
    expect(api.editorialCommands[0]?.key).toMatch(/^[0-9a-f-]{36}$/);
    await expectNoBlockingA11yViolations(page);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Resume graphics' }).click();
    await submitReason(page, 'Resume', 'Review complete');
    await expect(banner(page)).toBeHidden();
  });

  test('takes the on-air graphic off air from the preview', async ({
    page,
  }) => {
    const api = await openStudio(page);
    await page.getByRole('button', { name: /Take off air: / }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'Pressure building on the left',
    );
    await submitReason(page, 'Take off air', 'Wrong player credited');
    await expect(
      page.getByRole('group', { name: /standing by/ }),
    ).toBeVisible();
    await expect(page.getByText('Taken off air by a producer')).toBeVisible();
    expect(api.editorialCommands[0]?.path).toBe(
      `/overlays/${OVERLAY_ID}/retract`,
    );
    await expect(
      page.getByRole('button', { name: /Take off air: / }),
    ).toBeHidden();
  });

  test('guards the emergency stop with a typed confirmation', async ({
    page,
  }) => {
    const api = await openStudio(page);
    await page
      .getByRole('button', { name: 'Emergency stop', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Reason').fill('Feed integrity incident');
    await dialog.getByRole('button', { name: 'Continue' }).click();
    const phrase = dialog.getByLabel('Confirmation');
    await expect(phrase).toBeFocused();
    await phrase.fill('stop');
    await dialog.getByRole('button', { name: 'Stop all graphics' }).click();
    await expect(dialog).toContainText('Type STOP exactly');
    expect(api.editorialCommands).toHaveLength(0);
    await expectNoBlockingA11yViolations(page);

    await phrase.fill('STOP');
    await dialog.getByRole('button', { name: 'Stop all graphics' }).click();
    await expect(banner(page)).toContainText('Emergency stop on');
    await expect(
      page.getByRole('button', { name: 'Release emergency stop' }),
    ).toBeVisible();
    expect(api.editorialCommands[0]?.path).toBe(
      '/editorial/kill-switch/activate',
    );
  });

  test('lists the activity log with load more', async ({ page }) => {
    await mockApi(page);
    await signIn(page, 'harbour.producer', `${STUDIO}/audit`);
    const table = page.getByRole('table', {
      name: /Activity: 2 shown, more/,
    });
    await expect(table).toBeVisible();
    await expect(table).toContainText('Producer note 1');
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(
      page.getByRole('table', { name: /Activity: 4 shown/ }),
    ).toBeVisible();
    await expect(page.getByText('End of the activity log.')).toBeVisible();
    await page.getByText('1 field changed').first().click();
    // At rest under the sticky header, which otherwise overlaps the filters once scrolled.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectNoBlockingA11yViolations(page);
    await expectNoHorizontalOverflow(page);
  });

  test('filters the audit trail with custom pickers', async ({ page }) => {
    await mockApi(page);
    await signIn(page, 'harbour.producer', `${STUDIO}/audit`);
    await expect(page.getByRole('table', { name: /Activity/ })).toBeVisible();
    const filters = page.getByRole('form', { name: 'Filter the activity log' });
    await filters.getByRole('button', { name: /Who$/ }).click();
    await page.getByRole('option', { name: 'Automatic' }).click();
    const action = filters.getByRole('combobox', { name: 'Action' });
    await action.fill('emergency');
    const option = page.getByRole('option', { name: 'Emergency stop on' });
    await expect(option).toBeVisible();
    // A virtual press, as assistive tech sends: phones keep re-laying out the list.
    await option.dispatchEvent('click');
    await expect(action).toHaveValue('Emergency stop on');
    await filters
      .getByRole('group', { name: /When/ })
      .first()
      .getByRole('button', { name: /calendar/i })
      .click();
    await page.getByRole('button', { name: 'Last hour' }).click();
    await expect(filters.getByText(/ UTC$/)).toBeVisible();
    const request = page.waitForRequest(
      (r) =>
        r.url().includes('/audit-events') &&
        r.url().includes('actorType=SYSTEM'),
    );
    await filters.getByRole('button', { name: 'Apply filters' }).click();
    const url = new URL((await request).url());
    expect(url.searchParams.get('action')).toBe('kill-switch.activated');
    expect(url.searchParams.get('from')).toMatch(/Z$/);
    await expectNoBlockingA11yViolations(page);
  });

  test('explains locked controls on the signed-out public demo', async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto(STUDIO);
    const freeze = page.getByRole('button', { name: 'Pause graphics' });
    await expect(freeze).toHaveAttribute('aria-disabled', 'true');
    await expect(freeze).toHaveAccessibleDescription(/Producer/);
    // aria-disabled keeps it focusable; force the click to prove it stays inert.
    await freeze.click({ force: true });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto(`${STUDIO}/audit`);
    await expect(page.getByTestId('access-denied')).toBeVisible();
  });
});
