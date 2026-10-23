import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_COPY } from '@/constants/auth';
import { EDITORIAL_PROBLEMS } from '@/constants/editorial';
import {
  BOUNDARY_COPY,
  ERROR_COPY,
  ERROR_UI,
  FORBIDDEN_COPY_PATTERNS,
  PAGE_ERROR_COPY,
} from '@/constants/errors';
import { LOBBY_COPY } from '@/constants/lobby';
import { PWA_COPY } from '@/constants/pwa';
import { CONNECTION_COPY } from '@/constants/studio';
import { PROBLEM_COPY } from '@/constants/problem-copy';
import {
  ApiError,
  httpError,
  invalidResponseError,
  networkError,
  parseRetryAfter,
  timeoutError,
} from '@/lib/api/api-error';
import { humanizeError, type HumanError } from './humanize-error';

const OPENAPI = join(__dirname, '../../../../../docs/api/openapi.json');
const PROBLEM_TYPE = /urn:matchiq:problem:([a-z0-9-]+)/g;

const problem = (status: number, slug: string, detail?: string) =>
  new ApiError('http', {
    type: `urn:matchiq:problem:${slug}`,
    title: 'Raw API title that must not show',
    status,
    detail: detail ?? 'select * from fixtures where id = $1',
    requestId: 'req_abc12345',
  });

const visible = (h: HumanError) => `${h.title} ${h.message}`;

const expectFriendly = (h: HumanError) => {
  for (const pattern of FORBIDDEN_COPY_PATTERNS)
    expect(visible(h)).not.toMatch(pattern);
  expect(visible(h)).not.toMatch(/Raw API title|select \*|req_abc/);
};

afterEach(() => vi.unstubAllGlobals());

describe('humanizeError', () => {
  const documented = [
    ...readFileSync(OPENAPI, 'utf8').matchAll(PROBLEM_TYPE),
  ].map((m) => m[1] ?? '');

  it('has copy for every problem type the API documents', () => {
    expect(documented.length).toBeGreaterThan(20);
    for (const slug of new Set(documented))
      expect(PROBLEM_COPY[slug], slug).toBeDefined();
  });

  it.each([...new Set(documented)])('maps %s to friendly copy', (slug) => {
    const human = humanizeError(problem(422, slug));
    expectFriendly(human);
    expect(human.action).toMatch(/retry|signIn|lobby|wait|reload|none/);
  });

  it.each([
    [400, 'invalid', 'retry'],
    [401, 'sessionExpired', 'signIn'],
    [403, 'forbidden', 'lobby'],
    [404, 'notFound', 'lobby'],
    [409, 'conflict', 'retry'],
    [422, 'invalid', 'retry'],
    [429, 'rateLimited', 'wait'],
    [500, 'server', 'retry'],
    [502, 'server', 'retry'],
    [503, 'unavailable', 'wait'],
  ])('maps status %i to %s with %s', (status, kind, action) => {
    const human = humanizeError(problem(status, `http-${status}`));
    expect(human).toMatchObject({ kind, action });
    expectFriendly(human);
  });

  it('describes network failures, timeouts and offline', () => {
    expect(humanizeError(networkError('Failed to fetch')).kind).toBe('network');
    expect(humanizeError(timeoutError()).kind).toBe('timeout');
    vi.stubGlobal('navigator', { onLine: false });
    expect(humanizeError(networkError('Failed to fetch')).kind).toBe('offline');
    expect(humanizeError(new TypeError('x')).kind).toBe('offline');
  });

  it('treats contract mismatches and unknown throws as our fault', () => {
    const invalid = humanizeError(invalidResponseError('items.0: Required'));
    expect(invalid.kind).toBe('server');
    expectFriendly(invalid);
    const unknown = humanizeError(new Error('Cannot read undefined'));
    expect(unknown.kind).toBe('unexpected');
    expectFriendly(unknown);
  });

  it('prefers the specific problem over its status', () => {
    const human = humanizeError(problem(404, 'fixture-not-found'));
    expect(human).toMatchObject({ specific: true, action: 'lobby' });
    expect(human.title).toBe("We couldn't find this match");
  });

  it('keeps the request id only as a support reference', () => {
    const human = humanizeError(problem(500, 'internal-error'));
    expect(human).toMatchObject({ reference: 'req_abc12345', support: true });
  });

  it('waits for Retry-After on 429 and 503', () => {
    const headers = new Headers({ 'Retry-After': '12' });
    const human = humanizeError(httpError(503, null, headers));
    expect(human).toMatchObject({ kind: 'unavailable', retryAfterSeconds: 12 });
    const capacity = new ApiError(
      'http',
      { type: 'urn:matchiq:problem:replay-capacity', title: 't', status: 503 },
      45,
    );
    expect(humanizeError(capacity)).toMatchObject({
      action: 'wait',
      retryAfterSeconds: 45,
    });
  });

  it('parses Retry-After as seconds or an HTTP date', () => {
    expect(parseRetryAfter('30')).toBe(30);
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
    const now = Date.parse('2026-10-23T12:00:00Z');
    expect(parseRetryAfter('Fri, 23 Oct 2026 12:00:20 GMT', now)).toBe(20);
  });
});

describe('copy guard', () => {
  const strings = (value: unknown, path = ''): [string, string][] => {
    if (typeof value === 'string') return [[path, value]];
    if (typeof value === 'function' && value.length <= 2) {
      const out = (value as (...a: unknown[]) => unknown)('Penbrook', 3);
      return typeof out === 'string' ? [[path, out]] : [];
    }
    if (value && typeof value === 'object' && !(value instanceof RegExp))
      return Object.entries(value).flatMap(([k, v]) =>
        strings(v, `${path}.${k}`),
      );
    return [];
  };

  it('keeps forbidden tokens out of every error, empty and notice string', () => {
    const scanned = strings({
      errors: ERROR_COPY,
      problems: PROBLEM_COPY,
      ui: ERROR_UI,
      boundary: BOUNDARY_COPY,
      page: PAGE_ERROR_COPY,
      connection: CONNECTION_COPY,
      auth: AUTH_COPY.errors,
      authAction: AUTH_COPY.sessionExpiredAction,
      offline: PWA_COPY.offline,
      lobby: LOBBY_COPY,
      editorial: EDITORIAL_PROBLEMS,
    });
    expect(scanned.length).toBeGreaterThan(80);
    for (const [path, text] of scanned)
      for (const pattern of FORBIDDEN_COPY_PATTERNS)
        expect(text, path).not.toMatch(pattern);
  });
});
