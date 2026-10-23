import { expect, type Page, test } from '@playwright/test';
import { FIXTURE_ID } from './support/mock-fixture';
import { mockApi, type MockApiOptions } from './support/mock-api';
import { signIn } from './support/sign-in';

const OUT_DIR =
  process.env['SCREENSHOT_OUTPUT_DIR'] ??
  `${__dirname}/../../../docs/screenshots/factchecks-recap`;
const enabled = Boolean(process.env['CAPTURE_SCREENSHOTS']);
/** `before` captures the pre-polish build; `after` the current one. */
const SET = process.env['SCREENSHOT_SET'] ?? 'after';

const VIEWPORTS = [
  { name: '1440', viewport: { width: 1440, height: 900 }, scale: 1 },
  { name: '390', viewport: { width: 390, height: 844 }, scale: 2 },
] as const;

type Screen = {
  name: string;
  path: string;
  options: MockApiOptions;
  ready: (page: Page) => Promise<void>;
};

const SCREENS: Screen[] = [
  {
    name: 'factchecks',
    path: `/studio/${FIXTURE_ID}/observatory`,
    options: { faults: true, load: true },
    ready: (page) => expect(page.getByRole('article').first()).toBeVisible(),
  },
  {
    name: 'recap',
    path: `/studio/${FIXTURE_ID}/recap`,
    options: {},
    ready: (page) =>
      expect(page.getByRole('list', { name: 'Key moments' })).toBeVisible(),
  },
  {
    name: 'recap-not-ready',
    path: `/studio/${FIXTURE_ID}/recap`,
    options: { recap: 'notReady' },
    ready: (page) =>
      expect(page.getByText('The recap is ready at full time')).toBeVisible(),
  },
];

/** Opt-in capture for the fact-checks and recap review: `CAPTURE_SCREENSHOTS=1`. */
for (const vp of VIEWPORTS) {
  test.describe(`fact-checks and recap screenshots ${vp.name}`, () => {
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
          await mockApi(page, screen.options);
          await signIn(page, 'harbour.producer', screen.path);
          await screen.ready(page);
          await page.screenshot({
            path: `${OUT_DIR}/${SET}/${screen.name}-${vp.name}-${theme}.png`,
            fullPage: true,
          });
        });
      }
    }
  });
}
