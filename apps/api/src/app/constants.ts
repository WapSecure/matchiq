export const SERVICE_NAME = 'matchiq-api';

export const ROUTES = {
  fixtures: 'fixtures',
  fixture: ':fixtureId',
  // path-to-regexp treats ':' as a parameter marker, so the literal colon is escaped.
  eventsBatch: ':fixtureId/events\\:batch',
  events: ':fixtureId/events',
  stream: ':fixtureId/stream',
  sessions: ':fixtureId/sessions',
  replay: ':fixtureId/replay',
  state: ':fixtureId/state',
  insights: ':fixtureId/insights',
  narratives: ':fixtureId/narratives',
  overlays: ':fixtureId/overlays',
  recap: ':fixtureId/recap',
  agentRuns: ':fixtureId/agent-runs',
  fixtureTemplates: 'fixture-templates',
  replaySessions: 'replay-sessions',
  overlayResource: 'overlays',
  overlayRetract: ':overlayId/retract',
  insightResource: 'insights',
  insightSuppress: ':insightId/suppress',
  editorial: ':fixtureId/editorial',
  editorialFreeze: ':fixtureId/editorial/freeze',
  editorialResume: ':fixtureId/editorial/resume',
  killSwitch: 'editorial/kill-switch',
  killSwitchActivate: 'editorial/kill-switch/activate',
  killSwitchRelease: 'editorial/kill-switch/release',
  auditEvents: 'audit-events',
} as const;

/** Named throttlers: `default` covers every route, `replay` only replay controls (ADR-0010). */
export const THROTTLERS = { default: 'default', replay: 'replay' } as const;
export const REPLAY_THROTTLE_KEY = 'matchiq:replay-throttle';

export const ROUTE_PARAMS = {
  fixtureId: 'fixtureId',
  overlayId: 'overlayId',
  insightId: 'insightId',
} as const;

export const HEADERS = {
  authorization: 'authorization',
  wwwAuthenticate: 'WWW-Authenticate',
  idempotencyKey: 'idempotency-key',
  idempotentReplay: 'Idempotent-Replayed',
  retryAfter: 'Retry-After',
  lastEventId: 'last-event-id',
  requestId: 'x-request-id',
  correlationId: 'x-correlation-id',
} as const;

export const HEADER_NAMES = { cacheControl: 'Cache-Control' } as const;
export const CACHE_CONTROL = { noStore: 'no-store' } as const;

export const AUTH = {
  bearerPrefix: 'Bearer ',
  challenge: 'Bearer realm="matchiq-operator"',
  operatorActor: 'operator',
} as const;

export const AUTH_DETAILS = {
  missing: 'Send Authorization: Bearer <operator key>',
  invalid: 'The operator key is not valid',
  missingPermission: (permission: string) =>
    `This action requires the ${permission} permission`,
} as const;

export const API_LIMITS = {
  jsonBodyLimit: '2mb',
  fixtureListDefault: 50,
  fixtureListMax: 100,
  eventPageDefault: 100,
  eventPageMax: 500,
  streamReplayPage: 500,
  rateLimitWindowMs: 60_000,
  shutdownGraceMs: 5_000,
  sessionListDefault: 20,
  sessionListMax: 100,
  /** Seconds a client should wait after a replay-capacity 503. */
  replayCapacityRetryAfterS: 30,
} as const;

export const PATTERNS = {
  /** RFC 9110 token-ish visible ASCII, bounded. */
  idempotencyKey: /^[\x21-\x7e]{1,255}$/,
  nonNegativeInteger: /^(0|[1-9]\d{0,15})$/,
} as const;

export const ID_PREFIXES = { ingestion: 'ing_' } as const;

export const IDEMPOTENCY_SCOPES = {
  createFixture: 'POST /fixtures',
  ingestBatch: 'POST /fixtures/events:batch',
  retractOverlay: 'POST /overlays/retract',
  suppressInsight: 'POST /insights/suppress',
  freeze: 'POST /fixtures/editorial/freeze',
  resume: 'POST /fixtures/editorial/resume',
  killSwitchActivate: 'POST /editorial/kill-switch/activate',
  killSwitchRelease: 'POST /editorial/kill-switch/release',
  createSession: 'POST /fixtures/sessions',
  replayCommand: 'POST /fixtures/replay',
} as const;

export const AUDIT_TARGETS = {
  fixture: 'fixture',
  overlay: 'overlay',
  insight: 'insight',
  organization: 'organization',
} as const;

export const SSE = {
  contentType: 'text/event-stream; charset=utf-8',
  cacheControl: 'no-cache, no-transform',
  connection: 'keep-alive',
  noBuffering: 'no',
  retryMs: 2_000,
  heartbeatType: 'heartbeat',
} as const;

export const PROBLEMS = {
  unauthorized: {
    title: 'Operator credentials required',
    slug: 'unauthorized',
  },
  fixtureNotFound: { title: 'Fixture not found', slug: 'fixture-not-found' },
  fixtureExists: { title: 'Fixture already exists', slug: 'fixture-exists' },
  fixtureMismatch: {
    title: 'Events must belong to the fixture in the path',
    slug: 'fixture-mismatch',
  },
  eventConflict: {
    title: 'Events conflict with the stored ledger',
    slug: 'event-conflict',
  },
  idempotencyMismatch: {
    title: 'Idempotency-Key was reused with a different request',
    slug: 'idempotency-key-reused',
  },
  invalidHeader: { title: 'Invalid request header', slug: 'invalid-header' },
  streamUnavailable: {
    title: 'Live stream is temporarily unavailable',
    slug: 'stream-unavailable',
  },
  templateNotFound: {
    title: 'Fixture template not found',
    slug: 'fixture-template-not-found',
  },
  sessionNotFound: {
    title: 'Replay session not found',
    slug: 'replay-session-not-found',
  },
  replayConflict: {
    title: 'Replay command not allowed in the current state',
    slug: 'replay-state-conflict',
  },
  replayUnavailable: {
    title: 'Replay control is temporarily unavailable',
    slug: 'replay-unavailable',
  },
  replayCapacity: {
    title: 'Every replay slot is in use',
    slug: 'replay-capacity',
  },
  stateNotFound: {
    title: 'No match state has been projected yet',
    slug: 'state-not-found',
  },
  recapNotReady: {
    title: 'The recap is available once the match has ended',
    slug: 'recap-not-ready',
  },
  forbidden: {
    title: 'The caller lacks the required permission',
    slug: 'forbidden',
  },
  overlayNotFound: {
    title: 'Overlay cue not found',
    slug: 'overlay-not-found',
  },
  overlayNotOnAir: {
    title: 'Only a cue that is on air can be retracted',
    slug: 'overlay-not-on-air',
  },
  insightNotFound: { title: 'Insight not found', slug: 'insight-not-found' },
  insightPublished: {
    title: 'The insight is already published; retract its cue instead',
    slug: 'insight-already-published',
  },
  invalidCursor: { title: 'Invalid pagination cursor', slug: 'invalid-cursor' },
  demoFaultsDisabled: {
    title: 'Demo fault scenarios are disabled here',
    slug: 'demo-faults-disabled',
  },
} as const;

/** Stream copy for `overlay.retract.reason`; the operator's own reason stays in the audit row. */
export const RETRACT_REASONS = {
  PRODUCER: 'retracted by producer',
  INSIGHT_SUPPRESSED: 'insight suppressed by producer',
  KILL_SWITCH: 'editorial kill switch activated',
} as const;

export const EDITORIAL_DETAILS = {
  overlayState: (status: string) => `the cue is ${status}`,
  insightState: (publication: string) => `publication is ${publication}`,
} as const;

export const REPLAY_CAPACITY = {
  detail: (active: number, max: number) =>
    `${active} of ${max} replay sessions are playing; try again shortly or join a running session`,
  /** Commands that move a session into PLAYING and so need a free slot. */
  slotActions: ['start', 'resume'],
} as const;

export const REPLAY_CONFLICTS = {
  transition: (action: string, state: string) =>
    `cannot ${action} while ${state}`,
  seekBackwards: (sequence: number, applied: number) =>
    `seek to ${sequence} is not after the applied sequence ${applied}; scrub back over received events on the client`,
  seekOutOfRange: (sequence: number, last: number) =>
    `sequence ${sequence} is outside 0..${last}`,
} as const;

export const HEADER_ERRORS = {
  invalidFormat: 'invalid format',
  notNonNegativeInteger: 'must be a non-negative integer',
} as const;

export const FIELD_MESSAGES = {
  mustMatchPath: (fixtureId: string) => `must equal ${fixtureId} from the path`,
} as const;

export const CONFLICT_REASONS = {
  changedBody: 'eventId already stored with a different body',
  sequenceTaken: 'sequence already holds a different event',
  duplicateInBatch: 'eventId or sequence repeated within the batch',
} as const;

export const HEALTH_CHECKS = { postgres: 'postgres', redis: 'redis' } as const;

export const QUEUE_CONNECTION_NAME = 'matchiq-api-queues';
export const HEALTH_DETAILS = { unreachable: 'unreachable' } as const;
