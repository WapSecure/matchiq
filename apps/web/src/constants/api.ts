export const API_PATHS = {
  fixtures: '/fixtures',
  fixture: (fixtureId: string) => `/fixtures/${encodeURIComponent(fixtureId)}`,
  events: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/events`,
  state: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/state`,
  stream: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/stream`,
  replay: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/replay`,
} as const;

export const HTTP_HEADERS = {
  accept: 'Accept',
  contentType: 'Content-Type',
  idempotencyKey: 'Idempotency-Key',
  lastEventId: 'Last-Event-ID',
} as const;

export const MEDIA_TYPES = {
  json: 'application/json',
  problem: 'application/problem+json',
  eventStream: 'text/event-stream',
} as const;

export const API_LIMITS = {
  requestTimeoutMs: 10_000,
  eventsPageSize: 200,
  queryStaleMs: 15_000,
  queryRetries: 2,
} as const;

export const STREAM_TIMING = {
  backoffBaseMs: 1_000,
  backoffMaxMs: 30_000,
  backoffJitterRatio: 0.2,
  /** No message (heartbeat included) for this long marks the stream stale. */
  staleAfterMs: 15_000,
  /** A stale stream is torn down and reconnected after this long. */
  reconnectAfterStaleMs: 30_000,
  watchdogIntervalMs: 1_000,
  flushIntervalMs: 100,
} as const;

export const STORE_LIMITS = {
  timelineMax: 400,
  insightsMax: 60,
  momentumPointsMax: 180,
  retractionsMax: 8,
  activeCuesMax: 2,
} as const;

export const PROBLEM_FALLBACK = {
  network: {
    type: 'urn:matchiq:problem:network',
    title: 'The MatchIQ API could not be reached',
  },
  timeout: {
    type: 'urn:matchiq:problem:timeout',
    title: 'The MatchIQ API did not respond in time',
  },
  invalidResponse: {
    type: 'urn:matchiq:problem:invalid-response',
    title: 'The MatchIQ API returned data that does not match the contract',
  },
  http: {
    type: 'urn:matchiq:problem:http',
    title: 'The MatchIQ API returned an error',
  },
} as const;
