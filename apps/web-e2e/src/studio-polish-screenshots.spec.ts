import { expect, type Page, test } from '@playwright/test';
import { FIXTURE_ID } from './support/mock-fixture';
import { mockApi, type MockApi } from './support/mock-api';
import { mockSnapshot, OVERLAY_ID } from './support/mock-match';
import { mockStatus } from './support/mock-session';
import { envelope } from './support/mock-stream';
import { signIn } from './support/sign-in';

const OUT_DIR =
  process.env['SCREENSHOT_OUTPUT_DIR'] ??
  `${__dirname}/../../../docs/screenshots/studio-polish`;
const enabled = Boolean(process.env['CAPTURE_SCREENSHOTS']);
/** `before` captures the pre-polish build; `after` the current one. */
const SET = process.env['SCREENSHOT_SET'] ?? 'after';
const CUE_HOLD_WAIT_MS = 4_500;
const FULL_TIME_MS = 49 * 60_000 + 30_000;

const VIEWPORTS = [
  { name: '1440', viewport: { width: 1440, height: 900 }, scale: 1 },
  { name: '390', viewport: { width: 390, height: 844 }, scale: 2 },
] as const;

const frozen = () =>
  envelope('editorial.status', {
    fixtureId: FIXTURE_ID,
    mode: 'FROZEN',
    freeze: { active: true, changedAt: new Date().toISOString() },
    killSwitch: { active: false, changedAt: null },
  });

type Screen = { name: string; arrange: (api: MockApi) => Promise<void> };

const SCREENS: Screen[] = [
  { name: 'live', arrange: async () => undefined },
  {
    name: 'paused',
    arrange: async (api) => {
      await api.push(frozen());
      await api.push(
        envelope('overlay.retract', {
          overlayId: OVERLAY_ID,
          revision: 1,
          reason: 'retracted by producer',
          cause: 'PRODUCER',
        }),
      );
    },
  },
  {
    name: 'full-time',
    arrange: async (api) => {
      await api.push(
        envelope('match.snapshot', {
          ...mockSnapshot(FULL_TIME_MS, [61.4, 38.6], 1469),
          phase: 'COMPLETED',
        }),
      );
      await api.push(
        envelope(
          'replay.status',
          mockStatus({
            state: 'COMPLETED',
            appliedSequence: 1469,
            matchClockMs: FULL_TIME_MS,
          }),
        ),
      );
      await api.push(
        envelope('overlay.retract', {
          overlayId: OVERLAY_ID,
          revision: 1,
          reason: 'match ended',
          cause: 'MATCH_ENDED',
        }),
      );
    },
  },
];

const settle = (page: Page) =>
  expect(page.getByText('Pressure building on the left').first()).toBeVisible();

/** Opt-in capture for the studio review: `CAPTURE_SCREENSHOTS=1`. */
for (const vp of VIEWPORTS) {
  test.describe(`studio screenshots ${vp.name}`, () => {
    test.skip(!enabled, 'set CAPTURE_SCREENSHOTS=1 to capture');
    test.use({ viewport: vp.viewport, deviceScaleFactor: vp.scale });

    for (const theme of ['light', 'dark'] as const) {
      for (const screen of SCREENS) {
        test(`${screen.name} ${theme}`, async ({ page }, info) => {
          test.skip(
            info.project.name !== 'desktop-dark',
            'captured once, from the desktop project',
          );
          await page.emulateMedia({
            reducedMotion: 'reduce',
            colorScheme: theme,
          });
          const api = await mockApi(page);
          await signIn(page, 'harbour.producer', `/studio/${FIXTURE_ID}`);
          await settle(page);
          await screen.arrange(api);
          // A graphic that ran its course stays on screen for its minimum hold.
          await page.waitForTimeout(CUE_HOLD_WAIT_MS);
          await page.screenshot({
            path: `${OUT_DIR}/${SET}/studio-${screen.name}-${vp.name}-${theme}.png`,
            fullPage: true,
          });
        });
      }
    }
  });
}
