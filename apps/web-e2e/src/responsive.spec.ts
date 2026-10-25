import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const WIDTHS = [360, 768, 1920] as const;
const HEIGHT = 900;
const PAGES = [
  {
    name: 'lobby',
    path: '/fixtures',
    ready: 'Late comeback',
  },
  {
    name: 'studio',
    path: `/studio/${FIXTURE_ID}`,
    ready: 'Pressure building on the left',
  },
] as const;

test.describe('responsive layout', () => {
  for (const { name, path, ready } of PAGES) {
    for (const width of WIDTHS) {
      test(`${name} fits ${width}px with no sideways scroll and no blocking a11y issues`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: HEIGHT });
        await mockApi(page);
        await page.goto(path);
        await expect(page.getByText(ready).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectNoBlockingA11yViolations(page);
      });
    }
  }
});
