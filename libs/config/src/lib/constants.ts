export const DEFAULT_PORTS = { api: 3000, worker: 3001, agents: 8000 } as const;

export const DEFAULT_URLS = {
  apiPublic: `http://localhost:${DEFAULT_PORTS.api}`,
  apiBase: `http://localhost:${DEFAULT_PORTS.api}/api/v1`,
  agentsService: `http://localhost:${DEFAULT_PORTS.agents}`,
} as const;

export const ENV_LIMITS = {
  portMax: 65_535,
  secretMinLength: 32,
  rateLimitPerMinute: 300,
  agentTimeoutMinMs: 500,
  /** Mirrors LIMITS.maxAgentDeadlineMs: the slow lane for local inference. */
  agentTimeoutMaxMs: 180_000,
  agentTimeoutDefaultMs: 8_000,
  agentMaxRetries: 2,
  agentCircuitFailureThreshold: 5,
  databasePoolMaxDefault: 10,
  databasePoolMax: 100,
  outboxPollMinMs: 10,
  outboxPollMaxMs: 60_000,
  outboxPollDefaultMs: 250,
  outboxBatchMax: 1_000,
  outboxBatchDefault: 200,
  sseHeartbeatMinMs: 50,
  sseHeartbeatMaxMs: 60_000,
  sseHeartbeatDefaultMs: 15_000,
  replayRateLimitPerMinute: 30,
  agentJobConcurrencyMax: 16,
  agentJobConcurrencyDefault: 2,
  agentRetryBackoffMinMs: 50,
  agentRetryBackoffMaxMs: 60_000,
  agentRetryBackoffDefaultMs: 500,
  agentCircuitCooldownMinMs: 1_000,
  agentCircuitCooldownMaxMs: 600_000,
  agentCircuitCooldownDefaultMs: 30_000,
} as const;

export const ENV_PATTERNS = {
  orgId: /^org_[A-Za-z0-9_-]+$/,
  postgresProtocol: /^postgres(ql)?$/,
  redisProtocol: /^rediss?$/,
  redisKeyPrefix: /^[a-z][a-z0-9_-]{0,31}$/,
  origin: /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/,
} as const;

export const ENV_MESSAGES = {
  origin: 'must be an exact origin such as https://app.example.com',
} as const;

export const DEFAULT_DEMO_ORG_ID = 'org_demo';
export const DEFAULT_APP_VERSION = '0.0.0-dev';
export const REQUIRED_MESSAGE = 'is required';
export const CSV_SEPARATOR = ',';
export const DEFAULT_REDIS_KEY_PREFIX = 'matchiq';
