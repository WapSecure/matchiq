import { expect, type Page, test } from '@playwright/test';
import { mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { SHORT_SESSION_USER } from './support/oidc-users';
import { signIn } from './support/sign-in';

const TTL_SECONDS = SHORT_SESSION_USER.ttlSeconds ?? 0;
const POLL_INTERVAL_MS = 1_500;
/** Polls until a few seconds after the first access token has expired. */
const ROUNDS = Math.ceil(((TTL_SECONDS + 6) * 1_000) / POLL_INTERVAL_MS);
const PARALLEL = 3;

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One studio poll cycle, sent in parallel with the browser's cookies. The
 * BFF is not mocked here, so a live session gets 502 from the unreachable
 * test API, and a lost session gets 401.
 */
const pollRound = (page: Page) =>
  Promise.all([
    ...Array.from({ length: PARALLEL }, async () => {
      const res = await page.request.get('/auth/session');
      return String((await res.json()).status);
    }),
    ...Array.from({ length: PARALLEL }, async () => {
      const res = await page.request.get(
        `/bff/fixtures/${FIXTURE_ID}/agent-runs`,
      );
      return res.status() === 401 ? 'bff-401' : 'bff-ok';
    }),
  ]);

test.describe('session refresh', () => {
  test.skip(
    Boolean(process.env['E2E_OIDC_ISSUER']),
    'needs the bundled test issuer and its short-lived user',
  );

  test('stays signed in past access-token expiry under parallel polling', async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== 'desktop-dark',
      'timing test; one project is enough',
    );
    test.setTimeout(ROUNDS * POLL_INTERVAL_MS * 2 + 60_000);
    await mockApi(page);
    await signIn(page, SHORT_SESSION_USER.username);

    const expected = [
      ...Array.from({ length: PARALLEL }, () => 'authenticated'),
      ...Array.from({ length: PARALLEL }, () => 'bff-ok'),
    ];
    for (let round = 0; round < ROUNDS; round += 1) {
      expect(await pollRound(page), `poll round ${round}`).toEqual(expected);
      await pause(POLL_INTERVAL_MS);
    }

    await page.goto('/fixtures');
    await expect(
      page.getByRole('button', {
        name: new RegExp(`^Account: ${SHORT_SESSION_USER.name}`),
      }),
    ).toBeVisible();
    await expect(page.getByTestId('session-expired')).toHaveCount(0);
  });
});
