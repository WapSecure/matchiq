import type { Route } from '@playwright/test';
import { type EditorialRecorder, handleEditorial } from './mock-editorial';
import { FIXTURE_ID, mockFixture } from './mock-fixture';
import {
  mockEvents,
  mockSnapshot,
  MOMENTUM_SERIES,
  NOW_MS,
} from './mock-match';
import { mockInsight, mockCue, NARRATIVES } from './mock-match';
import {
  mockRecap,
  mockSessions,
  mockStatus,
  mockTemplates,
  mockTraces,
} from './mock-session';
import { mockFaultTraces } from './mock-faults';
import { mockLoadTraces } from './mock-load';

/** The public API and the signed-in BFF share one mock. */
const API_PREFIX = /^\/(api\/v1|bff)/;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

export const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

export const problem = (
  route: Route,
  status: number,
  title: string,
  slug = 'test',
) =>
  route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/problem+json' },
    body: JSON.stringify({
      type: `urn:matchiq:problem:${slug}`,
      title,
      status,
      requestId: 'req_e2e',
    }),
  });

export const preflight = (route: Route) =>
  route.fulfill({ status: 204, headers: CORS });

export type MockApiOptions = {
  templates?: 'ok' | 'empty' | 'error' | 'forbidden';
  start?: 'ok' | 'rateLimited';
  recap?: 'ready' | 'notReady';
  /** Serve insights, narratives and cues from the read models (late join). */
  hydrate?: boolean;
  /** Add traces of demo fault scenarios (ADR-0020) to the observatory. */
  faults?: boolean;
  /** Add moments that fell back to standard wording under heavy load. */
  load?: boolean;
};

export type Recorder = {
  replayCommands: unknown[];
  sessionStarts: unknown[];
  editorialCommands: EditorialRecorder;
};

const initialState = () =>
  mockSnapshot(
    NOW_MS - (MOMENTUM_SERIES.length - 1) * 60_000,
    [null, null],
    600,
  );

const narrativesFor = (url: URL) =>
  Object.values(NARRATIVES).filter(
    (n) =>
      n.persona === url.searchParams.get('persona') &&
      n.locale === url.searchParams.get('locale'),
  );

type Reads = Record<string, (url: URL, o: MockApiOptions) => unknown>;

const READS: Reads = {
  '/state': () => initialState(),
  '/events': () => ({ items: mockEvents(), nextAfterSequence: null }),
  '/replay': () => mockStatus(),
  '/insights': (_, o) => ({ items: o.hydrate ? [mockInsight()] : [] }),
  '/narratives': (url, o) => ({ items: o.hydrate ? narrativesFor(url) : [] }),
  '/overlays': (_, o) => ({ items: o.hydrate ? [mockCue()] : [] }),
  '/agent-runs': (_, o) => ({
    items: [
      ...mockTraces(),
      ...(o.faults ? mockFaultTraces() : []),
      ...(o.load ? mockLoadTraces() : []),
    ],
  }),
};

const handlePost = (
  route: Route,
  path: string,
  options: MockApiOptions,
  recorder: Recorder,
) => {
  if (path.endsWith('/stream-tickets'))
    return json(route, {
      ticket: 'e2e-ticket',
      expiresAt: '2026-10-24T15:08:12Z',
    });
  const body = route.request().postDataJSON() as Record<string, unknown>;
  if (path.endsWith('/sessions')) {
    recorder.sessionStarts.push(body);
    if (options.start === 'rateLimited')
      return problem(route, 429, 'Too Many Requests');
    return json(
      route,
      { fixture: mockFixture(), session: mockSessions()[0] },
      201,
    );
  }
  recorder.replayCommands.push(body);
  const state = body['action'] === 'pause' ? 'PAUSED' : 'PLAYING';
  const speed = typeof body['speed'] === 'number' ? body['speed'] : 20;
  return json(route, mockStatus({ state, speed: speed as 20 }), 202);
};

const handleRead = (
  route: Route,
  url: URL,
  path: string,
  options: MockApiOptions,
) => {
  if (path.endsWith('/recap')) {
    return options.recap === 'notReady'
      ? problem(
          route,
          404,
          'The recap is available once the match has ended',
          'recap-not-ready',
        )
      : json(route, mockRecap());
  }
  const suffix = Object.keys(READS).find((s) => path.endsWith(s));
  if (suffix) return json(route, READS[suffix]?.(url, options));
  return json(
    route,
    mockFixture({
      fixtureId: decodeURIComponent(path.split('/')[2] ?? FIXTURE_ID),
    }),
  );
};

const handleLobby = (route: Route, path: string, options: MockApiOptions) => {
  if (path === '/replay-sessions')
    return json(route, { items: mockSessions() });
  if (options.templates === 'forbidden')
    return problem(route, 403, 'You do not have permission', 'forbidden');
  if (options.templates === 'error')
    return problem(route, 503, 'Template service unavailable');
  return json(route, {
    items: options.templates === 'empty' ? [] : mockTemplates(),
  });
};

export const handleRoute = (
  route: Route,
  options: MockApiOptions,
  recorder: Recorder,
) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(API_PREFIX, '');
  if (request.method() === 'OPTIONS') return preflight(route);
  if (path === '/fixture-templates' || path === '/replay-sessions')
    return handleLobby(route, path, options);
  const editorial = handleEditorial(
    route,
    path,
    recorder.editorialCommands,
    json,
  );
  if (editorial) return editorial;
  if (!path.startsWith('/fixtures/')) return problem(route, 404, 'Not found');
  if (request.method() === 'POST')
    return handlePost(route, path, options, recorder);
  return handleRead(route, url, path, options);
};
