import type { Page, Route } from '@playwright/test';
import type { StreamMessage } from '@matchiq/contracts';
import { FIXTURE_ID, mockFixture, mockFixtures } from './mock-fixture';
import {
  MOMENTUM_SERIES,
  mockEvents,
  mockSnapshot,
  NOW_MS,
} from './mock-match';
import {
  initialStreamMessages,
  resetStreamSequence,
  toFrame,
} from './mock-stream';

/** Matches the build-time default of `NEXT_PUBLIC_API_BASE_URL`. */
export const API_BASE = 'http://localhost:3000/api/v1';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const problem = (route: Route, status: number, title: string) =>
  route.fulfill({
    status,
    headers: { ...CORS, 'content-type': 'application/problem+json' },
    body: JSON.stringify({
      type: 'urn:matchiq:problem:test',
      title,
      status,
      requestId: 'req_e2e',
    }),
  });

export type MockApiOptions = {
  fixtures?: 'ok' | 'empty' | 'error';
  /** `partial` mirrors the API before `/state` and `/replay` exist (404). */
  backend?: 'full' | 'partial';
  stream?: StreamMessage[];
};

export type MockApi = {
  replayCommands: unknown[];
  /** Pushes one message onto every open mocked SSE connection. */
  push: (message: StreamMessage) => Promise<void>;
};

const replayAck = (command: { action?: string; speed?: number }) => ({
  fixtureId: FIXTURE_ID,
  state: command.action === 'pause' ? 'PAUSED' : 'PLAYING',
  speed: command.speed ?? 20,
  appliedSequence: 640,
  period: 2,
  matchClockMs: NOW_MS,
});

/** Runs in the page before app code: serves SSE from an open in-memory stream. */
const installStreamMock = ({ frames }: { frames: string[] }) => {
  const w = window as unknown as {
    __mqStreams: ReadableStreamDefaultController<Uint8Array>[];
    __mqPush: (f: string) => void;
  };
  const encoder = new TextEncoder();
  const original = window.fetch.bind(window);
  w.__mqStreams = [];
  w.__mqPush = (frame) =>
    w.__mqStreams.forEach((c) => c.enqueue(encoder.encode(frame)));
  window.fetch = (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!url.includes('/stream')) return original(input, init);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        w.__mqStreams.push(controller);
        frames.forEach((f) => controller.enqueue(encoder.encode(f)));
      },
    });
    return Promise.resolve(
      new Response(body, {
        headers: { 'content-type': 'text/event-stream' },
      }),
    );
  };
};

const handleFixtures = (route: Route, options: MockApiOptions) =>
  options.fixtures === 'error'
    ? problem(route, 503, 'Fixture service unavailable')
    : json(route, {
        items: options.fixtures === 'empty' ? [] : mockFixtures(),
      });

const handleReplay = (route: Route, replayCommands: unknown[]) => {
  const command = route.request().postDataJSON() as {
    action?: string;
    speed?: number;
  };
  replayCommands.push(command);
  return json(route, replayAck(command), 202);
};

const initialState = () =>
  mockSnapshot(
    NOW_MS - (MOMENTUM_SERIES.length - 1) * 60_000,
    [null, null],
    600,
  );

const handleFixtureResource = (
  route: Route,
  path: string,
  options: MockApiOptions,
  replayCommands: unknown[],
) => {
  const partial = options.backend === 'partial';
  if (partial && (path.endsWith('/replay') || path.endsWith('/state'))) {
    return problem(route, 404, 'Not Found');
  }
  if (path.endsWith('/replay')) return handleReplay(route, replayCommands);
  if (path.endsWith('/state')) return json(route, initialState());
  if (path.endsWith('/events')) {
    return json(route, { items: mockEvents(), nextAfterSequence: null });
  }
  return json(
    route,
    mockFixture({
      fixtureId: decodeURIComponent(path.split('/')[2] ?? FIXTURE_ID),
    }),
  );
};

const handleRoute = async (
  route: Route,
  options: MockApiOptions,
  replayCommands: unknown[],
) => {
  const request = route.request();
  const path = new URL(request.url()).pathname.replace('/api/v1', '');
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers: CORS });
  }
  if (path === '/fixtures') return handleFixtures(route, options);
  if (path.startsWith('/fixtures/')) {
    return handleFixtureResource(route, path, options, replayCommands);
  }
  return problem(route, 404, 'Not found');
};

/**
 * REST is mocked with `page.route`. The stream is mocked in-page by wrapping
 * `fetch`, because a routed response must be complete and cannot stay open.
 */
export const mockApi = async (
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApi> => {
  resetStreamSequence();
  const replayCommands: unknown[] = [];
  const stream = options.stream ?? initialStreamMessages();

  await page.addInitScript(installStreamMock, { frames: stream.map(toFrame) });

  await page.route(`${API_BASE}/**`, (route) =>
    handleRoute(route, options, replayCommands),
  );

  return {
    replayCommands,
    push: async (message) => {
      await page.evaluate(
        (frame) =>
          (window as unknown as { __mqPush: (f: string) => void }).__mqPush(
            frame,
          ),
        toFrame(message),
      );
    },
  };
};
