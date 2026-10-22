export const TABLES = {
  fixtures: 'fixtures',
  matchEvents: 'match_events',
  streamMessages: 'stream_messages',
  auditEvents: 'audit_events',
  idempotencyKeys: 'idempotency_keys',
  fixtureTemplates: 'fixture_templates',
  replaySessions: 'replay_sessions',
  insights: 'insights',
  narratives: 'narratives',
  overlayCues: 'overlay_cues',
  agentRuns: 'agent_runs',
  matchSnapshots: 'match_snapshots',
  matchRecaps: 'match_recaps',
} as const;

export const DB_LIMITS = {
  sha256HexLength: 64,
  idempotencyKeyMaxLength: 255,
  streamReadPageMax: 1_000,
  sessionListMax: 100,
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
  sessionCreated: 'replay.session.created',
  commandRejected: 'replay.command.rejected',
  sessionsPurged: 'retention.sessions.purged',
  retentionRun: 'retention.run',
} as const;

export const AUDIT_ACTORS = {
  anonymousViewer: 'anonymous-viewer',
  retention: 'system:retention',
  worker: 'system:worker',
} as const;
export const AUDIT_TARGET_TYPES = {
  fixture: 'fixture',
  retention: 'retention',
} as const;

export const RETENTION = {
  advisoryLockName: 'matchiq:retention',
  capacityLockPrefix: 'matchiq:replay-capacity:',
  sessionsTarget: 'replay_sessions',
} as const;

/** Session fixtures are `<templateId>_s<n>` (ADR-0013). */
export const SESSION_ID_SEPARATOR = '_s';
export const REPLAY_INGESTION_PREFIX = 'replay_';

/** BullMQ queue names; the Redis key prefix namespaces them per environment. */
export const QUEUES = {
  replayCommands: 'replay-commands',
  insightPipeline: 'insight-pipeline',
} as const;

export const JOB_NAMES = {
  replayCommand: 'replay-command',
  insightPipeline: 'insight-pipeline',
} as const;

/** BullMQ forbids ':' in custom job ids. */
export const JOB_ID_SEPARATOR = '__';

export const QUEUE_RETENTION = {
  completedCount: 1_000,
  failedCount: 1_000,
} as const;

export const SEED = {
  fixturesDirectory: 'fixtures',
  fileSuffix: '.json',
  encoding: 'utf8',
} as const;

export const MIGRATIONS_DIRECTORY = 'migrations';
export const DB_PACKAGE_PATH = ['libs', 'db'] as const;
export const TEST_DATABASE_PREFIX = 'mq_test_';
export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://matchiq:matchiq_local_only@localhost:54320/matchiq';
export const DEFAULT_TEST_REDIS_URL = 'redis://localhost:63790';
