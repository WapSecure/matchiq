import type { Page } from '@playwright/test';
import { OIDC_PASSWORD } from './oidc-users';

/** Drives the provider's login form; Keycloak and the test issuer share field ids. */
export const signIn = async (
  page: Page,
  username: string,
  returnTo = '/fixtures',
) => {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  await page.getByRole('link', { name: 'Continue to sign in' }).click();
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(OIDC_PASSWORD);
  await page.locator('#kc-login').click();
  await page.waitForURL((url) => url.pathname === returnTo);
};
