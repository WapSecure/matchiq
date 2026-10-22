import { expect, type Page, test } from '@playwright/test';
import { API_BASE, mockApi } from './support/mock-api';
import { FIXTURE_ID } from './support/mock-fixture';

const SCREENS = [
  '/',
  '/fixtures',
  `/studio/${FIXTURE_ID}`,
  `/studio/${FIXTURE_ID}/observatory`,
  `/studio/${FIXTURE_ID}/recap`,
  '/sign-in',
  '/offline',
  '/no-such-page',
];

const STORAGE_KEY = 'matchiq.theme';
const API_ORIGIN = new URL(API_BASE).origin;

const STATIC_HEADERS: Record<string, string | RegExp> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'permissions-policy': /camera=\(\).*microphone=\(\)/,
  'strict-transport-security': /^max-age=31536000; includeSubDomains$/,
};

const directives = (csp: string) =>
  new Map(
    csp.split(';').map((part) => {
      const [name = '', ...sources] = part.trim().split(/\s+/);
      return [name, sources] as const;
    }),
  );

/** Records CSP violations from the first byte, before any app script runs. */
const watchViolations = async (page: Page) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: string[] };
    w.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      w.__cspViolations.push(
        `${e.effectiveDirective} blocked ${e.blockedURI || 'inline'} (${e.sourceFile}:${e.lineNumber})`,
      ),
    );
  });
  return {
    consoleErrors,
    violations: () =>
      page.evaluate(
        () =>
          (window as unknown as { __cspViolations: string[] }).__cspViolations,
      ),
  };
};

test.describe('security headers', () => {
  test('pages carry a strict nonce-based CSP and the static headers', async ({
    page,
  }) => {
    await mockApi(page);
    const first = await page.goto('/fixtures');
    const headers = first?.headers() ?? {};
    for (const [name, value] of Object.entries(STATIC_HEADERS))
      expect(headers[name], name).toMatch(value);
    expect(headers['x-powered-by']).toBeUndefined();

    const csp = directives(headers['content-security-policy'] ?? '');
    const nonce = csp
      .get('script-src')
      ?.find((s) => s.startsWith("'nonce-"))
      ?.slice(7, -1);
    expect(nonce).toBeTruthy();
    expect(csp.get('script-src')).toContain("'strict-dynamic'");
    expect(csp.get('script-src')?.some((s) => s.startsWith("'sha256-"))).toBe(
      true,
    );
    expect(csp.get('script-src')).not.toContain("'unsafe-inline'");
    expect(csp.get('script-src')).not.toContain("'unsafe-eval'");
    expect(csp.get('connect-src')).toContain(API_ORIGIN);
    for (const name of ['object-src', 'frame-ancestors', 'base-uri'])
      expect(csp.get(name), name).toEqual(["'none'"]);
    expect(csp.get('form-action')?.[0]).toBe("'self'");

    // Next stamps the nonce on its own scripts; the theme bootstrap relies on its hash.
    const unstamped = await page
      .locator('script:not([nonce])')
      .evaluateAll((els) => els.map((el) => el.textContent ?? ''));
    expect(unstamped).toHaveLength(1);
    expect(unstamped[0]).toContain('localStorage');

    const second = await page.goto('/fixtures');
    expect(second?.headers()['content-security-policy']).not.toContain(nonce);
  });

  test('the service worker keeps its own policy', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.headers()['content-security-policy']).toBe("default-src 'self'");
    expect(res.headers()['service-worker-allowed']).toBe('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });

  for (const stored of ['system', 'light', 'dark'] as const) {
    test(`no CSP violations or console errors on any screen (${stored} theme)`, async ({
      page,
    }) => {
      await mockApi(page);
      if (stored !== 'system')
        await page.addInitScript(
          ([key, value]) => window.localStorage.setItem(key ?? '', value ?? ''),
          [STORAGE_KEY, stored],
        );
      const watch = await watchViolations(page);
      for (const path of SCREENS) {
        await page.goto(path);
        await page.waitForLoadState('load');
        if (stored !== 'system')
          await expect(page.locator('html')).toHaveAttribute(
            'data-theme',
            stored,
          );
        expect(await watch.violations(), path).toEqual([]);
      }
      expect(watch.consoleErrors.filter((e) => !isExpected404(e))).toEqual([]);
    });
  }
});

/** `/no-such-page` is deliberately missing; its 404 document load is logged by Chrome. */
const isExpected404 = (message: string) =>
  /Failed to load resource: the server responded with a status of 404/.test(
    message,
  );
