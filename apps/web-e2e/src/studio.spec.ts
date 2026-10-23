import { expect, type Page, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { OVERLAY_ID } from './support/mock-match';
import { mockStatus } from './support/mock-session';
import { envelope } from './support/mock-stream';

/** The feed, not the throttled live-region echo of the same headline. */
const insightFeed = (page: Page) =>
  page.getByRole('group', { name: 'AI insight feed' });

const openStudio = async (page: Page) => {
  const api = await mockApi(page);
  await page.goto(`/studio/${FIXTURE_ID}`);
  await expect(page.getByText('Pressure building on the left')).toBeVisible();
  return api;
};

test.describe('live studio', () => {
  test('shows score, clock, live status, insight and on-air cue', async ({
    page,
  }) => {
    await openStudio(page);
    const scoreboard = page.getByRole('region', { name: 'Scoreboard' });
    await expect(scoreboard).toContainText('67:12');
    await expect(scoreboard).toContainText('2nd half');
    await expect(
      page.getByRole('status').filter({ hasText: 'Stream Live' }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Northbridge seize control' }),
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: /1 cue on air/ }),
    ).toBeVisible();
    await expect(page.locator('[data-watermark]')).toHaveText(
      /synthetic match demo/i,
    );
  });

  test('labels unavailable momentum samples instead of zero', async ({
    page,
  }) => {
    await openStudio(page);
    const metrics = page.getByRole('region', { name: 'Live metrics' });
    await metrics.getByRole('button', { name: 'View as table' }).click();
    const firstRow = metrics
      .getByRole('group', { name: 'View as table' })
      .locator('tbody tr')
      .first();
    await expect(firstRow).toContainText('Not available');
  });

  test('evidence drawer is keyboard operable and restores focus', async ({
    page,
  }) => {
    await openStudio(page);
    const trigger = page.getByRole('button', {
      name: /open evidence for northbridge seize control/i,
    });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', {
      name: 'Northbridge seize control',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Close evidence' }),
    ).toBeFocused();
    await expect(dialog).toContainText('Triggering events');
    await expect(dialog).toContainText('Ball recovery');
    await expect(dialog).toContainText('recoveries.home.rolling6m');
    await expect(dialog).toContainText('Away side retained 46% possession');
    await page.keyboard.press('Tab');
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('persona and language switch the narrative but not the numbers', async ({
    page,
  }) => {
    await openStudio(page);
    const metrics = page.getByRole('region', { name: 'Live metrics' });
    const scoreboard = page.getByRole('region', { name: 'Scoreboard' });
    const before = [await metrics.innerText(), await scoreboard.innerText()];
    await page.getByRole('radio', { name: /Français/ }).check({ force: true });
    await expect(
      insightFeed(page).getByText('Northbridge prend le contrôle'),
    ).toBeVisible();
    await page.getByRole('radio', { name: /English/ }).check({ force: true });
    await page.getByRole('radio', { name: 'Analyst' }).check({ force: true });
    await expect(
      insightFeed(page).getByText('High regains drive home momentum swing'),
    ).toBeVisible();
    await page.getByRole('radio', { name: 'Casual' }).check({ force: true });
    await expect(
      insightFeed(page).getByText('Northbridge are on top now'),
    ).toBeVisible();
    expect([await metrics.innerText(), await scoreboard.innerText()]).toEqual(
      before,
    );
  });

  test('retracts an on-air cue immediately', async ({ page }) => {
    const api = await openStudio(page);
    await api.push(
      envelope('overlay.retract', {
        overlayId: OVERLAY_ID,
        revision: 1,
        reason: 'Superseded by goal review',
      }),
    );
    await expect(
      page.getByText('Pressure building on the left').first(),
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: /standing by/ }),
    ).toBeVisible();
    await expect(page.getByText('Superseded by goal review')).toBeVisible();
  });

  test('replay transport waits for the worker to confirm', async ({ page }) => {
    const api = await openStudio(page);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByText(/Waiting for the replay worker/)).toBeVisible();
    await api.push(envelope('replay.status', mockStatus({ state: 'PAUSED' })));
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
    // Controlled by server status: the radio only moves once the 202 lands.
    await page.getByRole('radio', { name: '5×' }).click({ force: true });
    await expect
      .poll(() => api.replayCommands)
      .toEqual([{ action: 'pause' }, { action: 'setSpeed', speed: 5 }]);
    await expect(page.getByRole('radio', { name: '5×' })).toBeChecked();
  });

  test('seeks forward only, bounded by the template event count', async ({
    page,
  }) => {
    const api = await openStudio(page);
    const seek = page.getByRole('slider', { name: 'Skip ahead to event' });
    await expect(seek).toHaveAttribute('max', '1469');
    await expect(seek).toHaveAttribute('aria-valuetext', 'Event 641 of 1470');
    await seek.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(seek).toHaveAttribute('aria-valuetext', 'Event 641 of 1470');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => api.replayCommands)
      .toEqual([{ action: 'seek', sequence: 641 }]);
  });

  test('hydrates read models when joining mid-match', async ({ page }) => {
    await mockApi(page, { hydrate: true, stream: [] });
    await page.goto(`/studio/${FIXTURE_ID}`);
    await expect(
      page.getByRole('article', { name: 'Northbridge seize control' }),
    ).toBeVisible();
    await expect(page.getByText('Pressure building on the left')).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Stream Live' }),
    ).toBeVisible();
  });

  test('offers four languages, including Pidgin, by keyboard at 390 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudio(page);
    const languages = page.getByRole('radiogroup', { name: 'Language' });
    await expect(languages.getByRole('radio')).toHaveCount(4);
    const scoreboard = page.getByRole('region', { name: 'Scoreboard' });
    const before = (await scoreboard.textContent()) ?? '';
    await languages.getByRole('radio', { name: /English/ }).focus();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await expect(
      languages.getByRole('radio', { name: 'Naijá (Pidgin) (PCM)' }),
    ).toBeChecked();
    await expect(
      insightFeed(page).getByText('Northbridge don take control'),
    ).toBeVisible();
    await expect(scoreboard).toHaveText(before);
    await expectNoHorizontalOverflow(page);
    await expectNoBlockingA11yViolations(page);
  });

  test('has no serious or critical accessibility violations', async ({
    page,
  }) => {
    await openStudio(page);
    await expectNoBlockingA11yViolations(page);
  });

  test('has no serious or critical accessibility violations with the drawer open', async ({
    page,
  }) => {
    await openStudio(page);
    await page.getByRole('button', { name: /open evidence/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });

  test('does not scroll horizontally', async ({ page }) => {
    await openStudio(page);
    await expectNoHorizontalOverflow(page);
  });
});
