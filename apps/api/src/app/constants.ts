export const SERVICE_NAME = 'matchiq-api';

export const ROUTES = {
  fixtures: 'fixtures',
  fixture: ':fixtureId',
  // path-to-regexp treats ':' as a parameter marker, so the literal colon is escaped.
  eventsBatch: ':fixtureId/events\\:batch',
  events: ':fixtureId/events',
  stream: ':fixtureId/stream',
} as const;

export const ROUTE_PARAMS = { fixtureId: 'fixtureId' } as const;

export const HEADERS = {
  authorization: 'authorization',
  wwwAuthenticate: 'WWW-Authenticate',
  idempotencyKey: 'idempotency-key',
  idempotentReplay: 'Idempotent-Replayed',
  lastEventId: 'last-event-id',
  requestId: 'x-request-id',
} as const;

export const AUTH = {
  bearerPrefix: 'Bearer ',
  challenge: 'Bearer realm="matchiq-operator"',
  operatorActor: 'operator',
} as const;

export const AUTH_DETAILS = {
  missing: 'Send Authorization: Bearer <operator key>',
  invalid: 'The operator key is not valid',
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
} as const;

export const AUDIT_TARGETS = { fixture: 'fixture' } as const;

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
export const HEALTH_DETAILS = { unreachable: 'unreachable' } as const;
