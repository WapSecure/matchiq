import { expect, type Page, test } from '@playwright/test';
import { expectNoBlockingA11yViolations } from './support/a11y';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { OIDC_USERS } from './support/oidc-users';
import { signIn } from './support/sign-in';

const ROLE_LABEL: Record<string, string> = {
  producer: 'Producer',
  viewer: 'Viewer',
  analyst: 'Analyst',
  'tenant-owner': 'Organisation owner',
  'platform-operator': 'Platform operator',
};

const userNamed = (username: string) => {
  const user = OIDC_USERS.find((u) => u.username === username);
  if (!user) throw new Error(`unknown test user ${username}`);
  return user;
};

const openUserMenu = (page: Page) =>
  page.getByRole('button', { name: /^Account:/ }).click();

test.describe('sign-in', () => {
  test('offers single sign-on on an accessible page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sign in to MatchIQ' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Continue with single sign-on' }),
    ).toBeVisible();
    await expectNoBlockingA11yViolations(page);
  });

  test('offers a way back, falling back to the home page', async ({ page }) => {
    await page.goto('/sign-in');
    const back = page.getByRole('link', { name: 'Back', exact: true });
    await expect(back).toHaveAttribute('href', '/');
    await back.click();
    await page.waitForURL((url) => url.pathname === '/');
  });

  for (const username of [
    'harbour.producer',
    'harbour.viewer',
    'harbour.analyst',
    'harbour.owner',
    'northbank.producer',
  ]) {
    test(`signs in as ${username} and shows name, organisation and role`, async ({
      page,
    }) => {
      const user = userNamed(username);
      await mockApi(page);
      await signIn(page, username);
      await openUserMenu(page);
      const menu = page.locator('dl').filter({ hasText: 'Signed in as' });
      await expect(menu).toContainText(user.name);
      await expect(menu).toContainText(user.orgName);
      await expect(menu).toContainText(ROLE_LABEL[user.role] ?? user.role);
      await expectNoBlockingA11yViolations(page);
    });
  }

  test('rejects a wrong password at the provider', async ({ page }) => {
    await page.goto('/sign-in');
    await page
      .getByRole('link', { name: 'Continue with single sign-on' })
      .click();
    await page.locator('#username').fill('harbour.viewer');
    await page.locator('#password').fill('wrong-password');
    await page.locator('#kc-login').click();
    await expect(page.locator('#kc-login')).toBeVisible();
    await expect(page).not.toHaveURL(/\/fixtures/);
  });

  test('signs out and returns to the public demo', async ({ page }) => {
    await mockApi(page);
    await signIn(page, 'harbour.producer');
    await openUserMenu(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    const session = await page.request.get('/auth/session');
    expect((await session.json()).status).toBe('anonymous');
  });
});

test.describe('role-aware UI', () => {
  test('a viewer sees an accessible 403 state on the AI fact-checks', async ({
    page,
  }) => {
    await mockApi(page);
    await signIn(page, 'harbour.viewer');
    await page.goto(`/studio/${FIXTURE_ID}/observatory`);
    const denied = page.getByRole('region', {
      name: "You don't have access to this",
    });
    await expect(denied).toBeVisible();
    await expect(denied).toContainText('Viewer');
    await expectNoBlockingA11yViolations(page);
  });

  test('a producer can open the AI fact-checks and replay controls', async ({
    page,
  }) => {
    await mockApi(page);
    await signIn(page, 'harbour.producer', `/studio/${FIXTURE_ID}`);
    await expect(
      page.getByRole('group', { name: 'Replay controls' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'AI fact-checks' }).click();
    await expect(page.getByTestId('access-denied')).toHaveCount(0);
  });

  test('a platform operator gets the 403 state when the API refuses tenant data', async ({
    page,
  }) => {
    await mockApi(page, { templates: 'forbidden' });
    await signIn(page, 'platform.operator');
    await expect(page.getByTestId('access-denied').first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Start replay/ }),
    ).toHaveCount(0);
  });
});
