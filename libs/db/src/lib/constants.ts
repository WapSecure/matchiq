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
  preferenceProfiles: 'preference_profiles',
} as const;

export const DB_LIMITS = {
  sha256HexLength: 64,
  idempotencyKeyMaxLength: 255,
  streamReadPageMax: 1_000,
  /** Upper bound on sessions a kill switch locks and notifies in one transaction. */
  killSwitchFixturesMax: 100,
} as const;

export const PG_ERROR_CODES = { uniqueViolation: '23505' } as const;

export const STORE_ERRORS = {
  preferenceMissingAfterUpsert: 'preference profile missing after upsert',
} as const;

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
  retention: 'system:retention',
  worker: 'system:worker',
} as const;
export const AUDIT_TARGET_TYPES = {
  fixture: 'fixture',
  overlay: 'overlay',
  insight: 'insight',
  organization: 'organization',
  retention: 'retention',
} as const;

export const AUDIT_CURSOR = {
  encoding: 'base64url',
  idPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
} as const;

/** Keyset cursors for the lobby lists and the per-match insight, narrative, overlay and trace lists. */
export const PAGE_CURSOR = {
  encoding: 'base64url',
  kinds: {
    fixtures: 'f',
    templates: 't',
    sessions: 's',
    insights: 'i',
    narratives: 'n',
    overlays: 'o',
    traces: 'r',
  },
  integerPattern: /^(0|[1-9]\d{0,9})$/,
  textMax: 200,
  timestampPattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
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

/** ADR-0018: tenant transactions run as this non-owner role with RLS on. */
export const TENANCY = {
  appRole: 'matchiq_app',
  orgSetting: 'app.org_id',
  roleSetting: 'role',
} as const;
