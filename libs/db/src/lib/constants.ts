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
  editorialControls: 'editorial_controls',
} as const;

export const DB_LIMITS = {
  sha256HexLength: 64,
  idempotencyKeyMaxLength: 255,
  streamReadPageMax: 1_000,
  sessionListMax: 100,
  /** Upper bound on sessions a kill switch locks and notifies in one transaction. */
  killSwitchFixturesMax: 100,
} as const;

export const PG_ERROR_CODES = { uniqueViolation: '23505' } as const;

export const HASH_ALGORITHM = 'sha256';
export const HASH_ENCODING = 'hex';

export const REDIS_CHANNEL_SEGMENT = 'stream';
export const REDIS_CHANNEL_SEPARATOR = ':';
export const REDIS_PONG = 'PONG';

export { AUDIT_ACTIONS } from '@matchiq/contracts';

export const AUDIT_ACTORS = {
  anonymousViewer: 'anonymous-viewer',
  publishGate: 'publish-gate',
  overlayScheduler: 'overlay-scheduler',
} as const;
export const AUDIT_TARGET_TYPES = {
  fixture: 'fixture',
  overlay: 'overlay',
  insight: 'insight',
  organization: 'organization',
} as const;

export const AUDIT_CURSOR = {
  encoding: 'base64url',
  idPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
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
