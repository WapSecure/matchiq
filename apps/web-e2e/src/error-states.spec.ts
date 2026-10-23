import { expect, type Locator, type Page, test } from '@playwright/test';
import { expectNoBlockingA11yViolations } from './support/a11y';
import { API_BASE, mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';
import { signIn } from './support/sign-in';

const STUDIO = `/studio/${FIXTURE_ID}`;
const FIXTURE_URL = `${API_BASE}/fixtures/${FIXTURE_ID}`;

/** Text a user must never see, whatever failed. */
const TECHNICAL =
  /urn:|HTTP|\b[45]\d\d\b|Failed to fetch|undefined|Error:|Internal title|select \*/;

const CORS = { 'access-control-allow-origin': '*' };

type Failure = { status: number; slug: string; retryAfter?: number };

/** Answers `url` with a problem until `heal()` is called, then falls through to the mock. */
const failing = async (page: Page, url: string, failure: Failure) => {
  let healed = false;
  await page.route(url, (route) => {
    if (healed) return route.fallback();
    return route.fulfill({
      status: failure.status,
      headers: {
        ...CORS,
        'content-type': 'application/problem+json',
        ...(failure.retryAfter === undefined
          ? {}
          : {
              'retry-after': String(failure.retryAfter),
              'access-control-expose-headers': 'Retry-After',
            }),
      },
      body: JSON.stringify({
        type: `urn:matchiq:problem:${failure.slug}`,
        title: 'Internal title',
        status: failure.status,
        detail: 'select * from fixtures',
        requestId: 'req_e2e_42',
      }),
    });
  });
  return () => {
    healed = true;
  };
};

const expectFriendly = async (alert: Locator) => {
  await expect(alert).toBeVisible({ timeout: 15_000 });
  expect(await alert.innerText()).not.toMatch(TECHNICAL);
};

const errorState = (page: Page) => page.getByTestId('error-state');

test.describe('friendly error states', () => {
  test('lobby: a server error explains itself, offers a reference and recovers', async ({
    page,
  }) => {
    await mockApi(page);
    const heal = await failing(page, `${API_BASE}/fixture-templates`, {
      status: 500,
      slug: 'internal-error',
    });
    await page.goto('/fixtures');
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText("We couldn't load the matches");
    await expect(alert.getByTestId('support-reference')).toContainText(
      'req_e2e_42',
    );
    await expectNoBlockingA11yViolations(page);
    heal();
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('lobby: offline is calm and recovers once back online', async ({
    page,
  }) => {
    // The page itself must load, so only the browser's online flag and the API go dark.
    await page.addInitScript(() => {
      const w = window as unknown as { __mqOnline: boolean };
      w.__mqOnline = false;
      Object.defineProperty(Navigator.prototype, 'onLine', {
        get: () => w.__mqOnline,
      });
    });
    await mockApi(page);
    await page.route(`${API_BASE}/fixture-templates`, (route) =>
      route.abort('internetdisconnected'),
    );
    await page.goto('/fixtures');
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText("You're offline");
    await page.unroute(`${API_BASE}/fixture-templates`);
    await page.evaluate(() => {
      (window as unknown as { __mqOnline: boolean }).__mqOnline = true;
    });
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('lobby: rate limiting counts down from Retry-After, then retries', async ({
    page,
  }) => {
    await mockApi(page);
    const heal = await failing(page, `${API_BASE}/fixture-templates`, {
      status: 429,
      slug: 'rate-limited',
      retryAfter: 2,
    });
    await page.goto('/fixtures');
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText('Please wait a moment');
    await expect(
      alert.getByRole('button', { name: /Try again in \d+ s/ }),
    ).toBeDisabled();
    heal();
    await alert.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByRole('article').first()).toBeVisible();
  });

  test('studio: a missing match points back to the list of matches', async ({
    page,
  }) => {
    await mockApi(page);
    await failing(page, FIXTURE_URL, {
      status: 404,
      slug: 'fixture-not-found',
    });
    await page.goto(STUDIO);
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText("We couldn't find this match");
    await alert.getByRole('link', { name: 'Go to matches' }).click();
    await expect(page).toHaveURL(/\/fixtures$/);
  });

  test('studio: at capacity waits, then loads the match', async ({ page }) => {
    await mockApi(page);
    const heal = await failing(page, FIXTURE_URL, {
      status: 503,
      slug: 'dependency-unavailable',
      retryAfter: 1,
    });
    await page.goto(STUDIO);
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText("We couldn't open this match");
    heal();
    await alert.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Scoreboard' }),
    ).toBeVisible();
  });

  test('recap: a server error keeps the session tabs and retries', async ({
    page,
  }) => {
    await mockApi(page);
    const heal = await failing(page, `${FIXTURE_URL}/recap`, {
      status: 500,
      slug: 'internal-error',
    });
    await page.goto(`${STUDIO}/recap`);
    const alert = errorState(page);
    await expectFriendly(alert);
    await expect(alert).toContainText("We couldn't load the recap");
    await expect(
      page.getByRole('navigation', { name: 'Match views' }),
    ).toBeVisible();
    heal();
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  });

  test('Fact-checks: a failure is friendly and recoverable', async ({
    page,
  }) => {
    await mockApi(page);
    const heal = await failing(page, `${FIXTURE_URL}/agent-runs`, {
      status: 500,
      slug: 'internal-error',
    });
    await page.goto(`${STUDIO}/observatory`);
    const alert = errorState(page);
    await expectFriendly(alert);
    await expectNoBlockingA11yViolations(page);
    heal();
    await alert.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('error-state')).toHaveCount(0);
  });

  test('signed in: an ended session asks to sign in again and returns here', async ({
    page,
  }) => {
    await mockApi(page);
    await page.route('**/bff/audit-events**', (route) =>
      route.fulfill({
        status: 401,
        headers: { 'content-type': 'application/problem+json' },
        body: JSON.stringify({
          type: 'urn:matchiq:problem:bff-401',
          title: 'Sign in again',
          status: 401,
        }),
      }),
    );
    await signIn(page, 'harbour.producer', `${STUDIO}/audit`);
    const notice = page.getByTestId('session-expired');
    await expectFriendly(notice);
    await expect(notice).toContainText("You've been signed out for security");
    await expect(
      notice.getByRole('link', { name: 'Sign in again' }),
    ).toHaveAttribute(
      'href',
      `/sign-in?returnTo=${encodeURIComponent(`${STUDIO}/audit`)}&error=expired`,
    );
    await expectNoBlockingA11yViolations(page);
  });

  test('unknown pages get a friendly not-found page', async ({ page }) => {
    await page.goto('/no-such-page');
    const main = page.getByRole('main');
    await expect(main).toContainText("This page doesn't exist");
    expect(await main.innerText()).not.toMatch(TECHNICAL);
    await expect(page.getByRole('note')).toContainText('fictional');
  });
});
