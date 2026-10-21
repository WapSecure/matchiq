export const TABLES = {
  fixtures: 'fixtures',
  matchEvents: 'match_events',
  streamMessages: 'stream_messages',
  auditEvents: 'audit_events',
  idempotencyKeys: 'idempotency_keys',
} as const;

export const DB_LIMITS = {
  sha256HexLength: 64,
  idempotencyKeyMaxLength: 255,
  streamReadPageMax: 1_000,
} as const;

export const PG_ERROR_CODES = { uniqueViolation: '23505' } as const;

export const HASH_ALGORITHM = 'sha256';
export const HASH_ENCODING = 'hex';

export const REDIS_CHANNEL_SEGMENT = 'stream';
export const REDIS_CHANNEL_SEPARATOR = ':';
export const REDIS_PONG = 'PONG';

export const AUDIT_ACTIONS = {
  fixtureCreated: 'fixture.created',
  eventsIngested: 'events.ingested',
} as const;

export const MIGRATIONS_DIRECTORY = 'migrations';
export const DB_PACKAGE_PATH = ['libs', 'db'] as const;
export const TEST_DATABASE_PREFIX = 'mq_test_';
export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://matchiq:matchiq_local_only@localhost:54320/matchiq';
export const DEFAULT_TEST_REDIS_URL = 'redis://localhost:63790';
