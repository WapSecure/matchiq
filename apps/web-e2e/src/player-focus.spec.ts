import { expect, type Page, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const focusPanel = (page: Page) =>
  page.getByRole('region', { name: 'Player focus' });

const openStudio = async (page: Page) => {
  await mockApi(page);
  await page.goto(`/studio/${FIXTURE_ID}`);
  await expect(page.getByText('Pressure building on the left')).toBeVisible();
  const panel = focusPanel(page);
  await panel.scrollIntoViewIfNeeded();
  return panel;
};

const followCastell = async (page: Page) => {
  const panel = focusPanel(page);
  const picker = panel.getByRole('combobox', { name: 'Follow a player' });
  await picker.fill('Castell');
  await page.getByRole('option', { name: /Castell/ }).click();
  return panel;
};

test.describe('player focus (spec §27, §31.6)', () => {
  test('follows a player from match events, with the no-tracking badge', async ({
    page,
  }) => {
    const panel = await openStudio(page);
    await expect(panel.getByText('Pick a player to follow')).toBeVisible();
    await expect(panel.getByTestId('no-tracking-badge')).toHaveText(
      'No tracking data. Counts come from match events only',
    );
    await followCastell(page);
    const milestones = panel.getByRole('region', { name: 'Milestones' });
    await expect(milestones).toContainText('First shot on target');
    await expect(milestones).toContainText('Goal');
    await expect(
      panel.getByRole('region', { name: 'Their match' }),
    ).toContainText('Shot');
    await expect(page.locator('[data-followed="true"]').first()).toBeAttached();
    await expectNoBlockingA11yViolations(page);
  });

  test('keeps the followed player, persona and language after a reload', async ({
    page,
  }) => {
    await openStudio(page);
    await followCastell(page);
    await page.getByRole('radio', { name: 'Fan' }).check({ force: true });
    await page.getByRole('radio', { name: /Français/ }).check({ force: true });
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Fan' })).toBeChecked();
    await expect(page.getByRole('radio', { name: /Français/ })).toBeChecked();
    await expect(
      focusPanel(page).getByRole('button', { name: 'Castell', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('fits a 390 px phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudio(page);
    const panel = await followCastell(page);
    await expect(
      panel.getByRole('region', { name: 'Milestones' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
