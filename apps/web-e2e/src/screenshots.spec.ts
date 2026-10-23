import { expect, type Page, test } from '@playwright/test';
import { FIXTURE_ID } from './support/mock-fixture';
import { mockApi } from './support/mock-api';
import { signIn } from './support/sign-in';

const OUT_DIR =
  process.env['SCREENSHOT_OUTPUT_DIR'] ??
  `${__dirname}/../../../docs/screenshots/premium`;
const enabled = Boolean(process.env['CAPTURE_SCREENSHOTS']);
/** `before` captures the pre-redesign build; `after` the current one. */
const SET = process.env['SCREENSHOT_SET'] ?? 'after';
const THEMES = (process.env['SCREENSHOT_THEMES'] ?? 'dark,light').split(',');

const VIEWPORTS = [
  { name: 'desktop-1440', viewport: { width: 1440, height: 900 }, scale: 1 },
  { name: 'mobile-390', viewport: { width: 390, height: 844 }, scale: 2 },
] as const;

type Screen = {
  name: string;
  path: string;
  ready: (page: Page) => Promise<void>;
};

const SCREENS: Screen[] = [
  {
    name: 'landing',
    path: '/',
    ready: (page) =>
      expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
  },
  {
    name: 'lobby',
    path: '/fixtures',
    ready: (page) => expect(page.getByRole('article').first()).toBeVisible(),
  },
  {
    name: 'studio',
    path: `/studio/${FIXTURE_ID}`,
    ready: (page) =>
      expect(
        page.getByText('Pressure building on the left').first(),
      ).toBeVisible(),
  },
  {
    name: 'recap',
    path: `/studio/${FIXTURE_ID}/recap`,
    ready: (page) =>
      expect(page.getByRole('list', { name: 'Key moments' })).toBeVisible(),
  },
  {
    name: 'observatory',
    path: `/studio/${FIXTURE_ID}/observatory`,
    ready: (page) =>
      expect(page.getByRole('list', { name: 'Insight traces' })).toBeVisible(),
  },
  {
    name: 'audit',
    path: `/studio/${FIXTURE_ID}/audit`,
    ready: (page) => expect(page.getByRole('table').first()).toBeVisible(),
  },
];

/** Opt-in visual capture for PR review: `CAPTURE_SCREENSHOTS=1 pnpm e2e`. */
for (const vp of VIEWPORTS) {
  test.describe(`review screenshots ${vp.name}`, () => {
    test.skip(!enabled, 'set CAPTURE_SCREENSHOTS=1 to capture');
    test.use({ viewport: vp.viewport, deviceScaleFactor: vp.scale });

    for (const theme of THEMES) {
      for (const screen of SCREENS) {
        test(`${screen.name} ${theme}`, async ({ page }, info) => {
          test.skip(
            info.project.name !== 'desktop-dark',
            'captured once, from the desktop project',
          );
          await page.emulateMedia({
            reducedMotion: 'reduce',
            colorScheme: theme === 'light' ? 'light' : 'dark',
          });
          await mockApi(page);
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
