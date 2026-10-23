import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow } from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { signIn } from './support/sign-in';

for (const width of [320, 390]) {
  test.describe(`mobile match identity at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    test('keeps the fixture readable and the producer account accessible', async ({
      page,
    }) => {
      await mockApi(page);
      await signIn(page, 'harbour.producer', `/studio/${FIXTURE_ID}`);
      const heading = page.getByRole('heading', {
        level: 1,
        name: 'Northbridge Athletic v Harbourside Rovers',
      });
      await expect(heading).toBeVisible();
      const bounds = await heading.evaluate((element) => {
        const { x, right, width, height } = element.getBoundingClientRect();
        return { x, right, width, height, viewport: window.innerWidth };
      });
      expect(bounds.width).toBeGreaterThan(100);
      expect(bounds.height).toBeGreaterThan(10);
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
      const account = page.getByRole('button', {
        name: 'Account: Pat Producer, Producer',
      });
      await expect(account).toBeVisible();
      await account.click();
      await expect(
        page.getByText('Harbour Media (synthetic)', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Sign out' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(account).toHaveAttribute('aria-expanded', 'false');
      await expectNoHorizontalOverflow(page);
    });
  });
}
