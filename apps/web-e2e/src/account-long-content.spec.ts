import { expect, test } from '@playwright/test';
import {
  expectNoBlockingA11yViolations,
  expectNoHorizontalOverflow,
} from './support/a11y';
import { mockApi } from './support/mock-api';
import { signIn } from './support/sign-in';

const NAME = 'Chiamaka María-José Nguyễn Ọláwálé '.repeat(3).trim();
const ORGANISATION = 'ÉditionsSportivesInternationaleỌlọ́run'.repeat(5);
const ACCOUNT = `Account: ${NAME}, Producer`;

for (const width of [320, 390, 768, 1440]) {
  test.describe(`long account content at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('keeps international names readable and returns keyboard focus', async ({
      page,
    }) => {
      await mockApi(page);
      await page.route('**/auth/session', (route) =>
        route.fulfill({
          json: {
            status: 'authenticated',
            ssoEnabled: true,
            user: {
              sub: 'user_long_content',
              name: NAME,
              orgId: 'org_demo',
              orgName: ORGANISATION,
              roles: ['producer'],
            },
            permissions: ['fixtures:read', 'insights:read', 'overlays:read'],
          },
        }),
      );
      await signIn(page, 'harbour.producer');
      const trigger = page.getByRole('button', { name: ACCOUNT, exact: true });
      await expect(trigger).toBeVisible();
      await trigger.focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('dialog', { name: 'Account', exact: true });
      await expect(panel).toBeVisible();
      await expect(panel.getByText(NAME, { exact: true })).toBeVisible();
      await expect(
        panel.getByText(ORGANISATION, { exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const bounds = await panel.evaluate((element) => {
        const { left, right } = element.getBoundingClientRect();
        return { left, right, viewport: window.innerWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
      for (const detail of await panel.locator('dd').all()) {
        const overflow = await detail.evaluate((element) => ({
          horizontal: element.scrollWidth - element.clientWidth,
          vertical: element.scrollHeight - element.clientHeight,
        }));
        expect(overflow.horizontal).toBeLessThanOrEqual(0);
        expect(overflow.vertical).toBeLessThanOrEqual(0);
      }
      await expect(
        panel.getByRole('button', { name: 'Sign out', exact: true }),
      ).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await expectNoBlockingA11yViolations(page);
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
}
