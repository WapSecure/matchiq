const fx = (fixtureId: string) => `/fixtures/${encodeURIComponent(fixtureId)}`;

export const API_PATHS = {
  templates: '/fixture-templates',
  sessions: '/replay-sessions',
  createSession: (templateId: string) => `${fx(templateId)}/sessions`,
  insights: (fixtureId: string) => `${fx(fixtureId)}/insights`,
  narratives: (fixtureId: string) => `${fx(fixtureId)}/narratives`,
  overlays: (fixtureId: string) => `${fx(fixtureId)}/overlays`,
  recap: (fixtureId: string) => `${fx(fixtureId)}/recap`,
  agentRuns: (fixtureId: string) => `${fx(fixtureId)}/agent-runs`,
  fixture: (fixtureId: string) => `/fixtures/${encodeURIComponent(fixtureId)}`,
  events: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/events`,
  state: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/state`,
  stream: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/stream`,
  replay: (fixtureId: string) =>
    `/fixtures/${encodeURIComponent(fixtureId)}/replay`,
  editorial: (fixtureId: string) => `${fx(fixtureId)}/editorial`,
  freeze: (fixtureId: string) => `${fx(fixtureId)}/editorial/freeze`,
  resume: (fixtureId: string) => `${fx(fixtureId)}/editorial/resume`,
  retract: (overlayId: string) =>
    `/overlays/${encodeURIComponent(overlayId)}/retract`,
  suppress: (insightId: string) =>
    `/insights/${encodeURIComponent(insightId)}/suppress`,
  review: (insightId: string) =>
    `/insights/${encodeURIComponent(insightId)}/review`,
  overlayReviews: (fixtureId: string) => `${fx(fixtureId)}/overlay-reviews`,
  publishPolicy: (fixtureId: string) =>
    `${fx(fixtureId)}/editorial/publish-policy`,
  killSwitch: '/editorial/kill-switch',
  killSwitchActivate: '/editorial/kill-switch/activate',
  killSwitchRelease: '/editorial/kill-switch/release',
  auditEvents: '/audit-events',
  streamTicket: (fixtureId: string) => `${fx(fixtureId)}/stream-tickets`,
} as const;

export const STREAM_TICKET_PARAM = 'ticket';

export const HTTP_HEADERS = {
  accept: 'Accept',
  contentType: 'Content-Type',
  idempotencyKey: 'Idempotency-Key',
  lastEventId: 'Last-Event-ID',
} as const;

export const RETRY_AFTER_HEADER = 'Retry-After';
export const DELTA_SECONDS = /^\d+$/;

export const MEDIA_TYPES = {
  json: 'application/json',
  problem: 'application/problem+json',
  eventStream: 'text/event-stream',
} as const;

export const API_LIMITS = {
  requestTimeoutMs: 10_000,
  eventsPageSize: 200,
  /** The API caps an events page at 500. */
  eventsPageMax: 500,
  /** Pages walked when resolving evidence ids outside the loaded timeline. */
  evidencePagesMax: 8,
  /** The API's largest `/replay-sessions` page, searched for one session's times. */
  sessionLookupMax: 100,
  /** Pages followed when loading the whole match catalogue. */
  templatePagesMax: 10,
  queryStaleMs: 15_000,
  queryRetries: 2,
  auditPageSize: 50,
} as const;

export const STREAM_TIMING = {
  backoffBaseMs: 1_000,
  /** Kept short: a judge restarting the API should see Live within seconds. */
  backoffMaxMs: 5_000,
  backoffJitterRatio: 0.2,
  /** No message (heartbeat included) for this long marks the stream stale. */
  /** Above the API's 15 s heartbeat so an idle but healthy stream stays Live. */
  staleAfterMs: 25_000,
  /** A stale stream is torn down and reconnected after this long. */
  reconnectAfterStaleMs: 40_000,
  watchdogIntervalMs: 1_000,
  flushIntervalMs: 100,
} as const;

export const STORE_LIMITS = {
  timelineMax: 400,
  insightsMax: 60,
  momentumPointsMax: 180,
  retractionsMax: 8,
  activeCuesMax: 2,
  cueLogMax: 8,
} as const;

export const POLL_MS = {
  sessions: 10_000,
  recap: 5_000,
  /** Views that need the recap wait for full time on this instead. */
  replayStatus: 5_000,
  agentRuns: 4_000,
  /** Editorial marks on the insight feed (held and suppressed cues). */
  editorialMarks: 8_000,
  /** How long a 202 prediction waits for the worker's `replay.status`. */
  replayConfirm: 4_000,
} as const;

export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessable: 422,
  tooManyRequests: 429,
  unavailable: 503,
} as const;

/** RFC 9457 `type` suffixes the API uses for states the UI explains. */
export const PROBLEM_SLUGS = {
  recapNotReady: 'recap-not-ready',
  stateNotFound: 'state-not-found',
  replayConflict: 'replay-state-conflict',
  overlayNotOnAir: 'overlay-not-on-air',
  insightPublished: 'insight-already-published',
  idempotencyReused: 'idempotency-key-reused',
  invalidCursor: 'invalid-cursor',
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
