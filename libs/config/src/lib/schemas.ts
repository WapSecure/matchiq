import { z } from 'zod';
import {
  DEFAULT_APP_VERSION,
  DEFAULT_DEMO_ORG_ID,
  DEFAULT_METRICS,
  DEFAULT_PORTS,
  DEFAULT_REDIS_KEY_PREFIX,
  DEFAULT_URLS,
  ENV_LIMITS,
  ENV_PATTERNS,
} from './constants.js';
import {
  booleanFlag,
  boundedInt,
  csv,
  flag,
  optionalString,
  optionalUrl,
  originList,
  port,
  secret,
} from './fields.js';
import { checkDemoFaults, DemoFaultFields } from './demo-faults-env.js';
import { AppEnvironment } from './environment.js';
import { AuthFields, checkAuthEnv } from './auth-env.js';
import {
  ApiDocsEnv,
  ApprovalWindowEnv,
  ReplayCapacityEnv,
  RetentionEnv,
  TrustProxyEnv,
} from './operations-env.js';
import { TelemetryEnv, metricsPort } from './telemetry-env.js';

const postgresUrl = z.url({ protocol: ENV_PATTERNS.postgresProtocol });
const redisUrl = z.url({ protocol: ENV_PATTERNS.redisProtocol });

export { AppEnvironment } from './environment.js';
export const LogLevel = z.enum([
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
]);

export const CommonEnv = z.object({
  APP_ENV: AppEnvironment.default('local'),
  LOG_LEVEL: LogLevel.default('info'),
  APP_VERSION: z.string().min(1).default(DEFAULT_APP_VERSION),
  DEMO_ORG_ID: z
    .string()
    .regex(ENV_PATTERNS.orgId)
    .default(DEFAULT_DEMO_ORG_ID),
  OTEL_SERVICE_NAME: optionalString,
  APPLICATIONINSIGHTS_CONNECTION_STRING: optionalString,
  ...TelemetryEnv.shape,
});

/** `pnpm seed:fixtures` loads templates for `DEMO_ORG_ID` plus these organisations. */
export const SeedEnv = z.object({ SEED_ORG_IDS: csv });

/** Connection settings shared by every process that talks to Postgres. */
export const DatabaseEnv = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_POOL_MAX: boundedInt(
    1,
    ENV_LIMITS.databasePoolMax,
    ENV_LIMITS.databasePoolMaxDefault,
  ),
});

const RedisEnv = z.object({
  REDIS_URL: redisUrl,
  /** Namespaces channels and keys so environments can share one Redis. */
  REDIS_KEY_PREFIX: z
    .string()
    .regex(ENV_PATTERNS.redisKeyPrefix)
    .default(DEFAULT_REDIS_KEY_PREFIX),
});

const OutboxRelayEnv = z.object({
  OUTBOX_RELAY_ENABLED: flag('true'),
  OUTBOX_POLL_INTERVAL_MS: boundedInt(
    ENV_LIMITS.outboxPollMinMs,
    ENV_LIMITS.outboxPollMaxMs,
    ENV_LIMITS.outboxPollDefaultMs,
  ),
  OUTBOX_BATCH_SIZE: boundedInt(
    1,
    ENV_LIMITS.outboxBatchMax,
    ENV_LIMITS.outboxBatchDefault,
  ),
});

export const ApiEnv = CommonEnv.extend({
  ...DatabaseEnv.shape,
  ...RedisEnv.shape,
  ...OutboxRelayEnv.shape,
  ...ReplayCapacityEnv.shape,
  ...TrustProxyEnv.shape,
  ...ApiDocsEnv.shape,
  SSE_HEARTBEAT_MS: boundedInt(
    ENV_LIMITS.sseHeartbeatMinMs,
    ENV_LIMITS.sseHeartbeatMaxMs,
    ENV_LIMITS.sseHeartbeatDefaultMs,
  ),
  API_PORT: port(DEFAULT_PORTS.api),
  METRICS_PORT: metricsPort(DEFAULT_METRICS.apiPort),
  API_PUBLIC_URL: z.url().default(DEFAULT_URLS.apiPublic),
  CORS_ALLOWED_ORIGINS: originList,
  RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(ENV_LIMITS.rateLimitPerMinute),
  ...AuthFields,
  /** Per-client cap on anonymous replay controls (ADR-0010), stricter than reads. */
  REPLAY_RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(ENV_LIMITS.replayRateLimitPerMinute),
  ...DemoFaultFields,
})
  .superRefine(checkAuthEnv)
  .superRefine(checkDemoFaults);

export const WorkerEnv = CommonEnv.extend({
  ...DatabaseEnv.shape,
  ...RedisEnv.shape,
  ...OutboxRelayEnv.shape,
  ...ReplayCapacityEnv.shape,
  ...RetentionEnv.shape,
  ...ApprovalWindowEnv.shape,
  WORKER_PORT: port(DEFAULT_PORTS.worker),
  METRICS_PORT: metricsPort(DEFAULT_METRICS.workerPort),
  AGENTS_SERVICE_URL: z.url().default(DEFAULT_URLS.agentsService),
  AGENTS_SERVICE_TOKEN: secret,
  AGENT_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(ENV_LIMITS.agentTimeoutMinMs)
    .max(ENV_LIMITS.agentTimeoutMaxMs)
    .default(ENV_LIMITS.agentTimeoutDefaultMs),
  AGENT_MAX_RETRIES: z.coerce
    .number()
    .int()
    .min(0)
    .max(ENV_LIMITS.agentMaxRetries)
    .default(ENV_LIMITS.agentMaxRetries),
  AGENT_CIRCUIT_FAILURE_THRESHOLD: z.coerce
    .number()
    .int()
    .min(1)
    .default(ENV_LIMITS.agentCircuitFailureThreshold),
  AI_ENABLED: booleanFlag,
  /** Concurrent agents-pipeline jobs; bounds load on the model provider. */
  AGENT_JOB_CONCURRENCY: boundedInt(
    1,
    ENV_LIMITS.agentJobConcurrencyMax,
    ENV_LIMITS.agentJobConcurrencyDefault,
  ),
  /** Wall-clock age after which a queued moment skips AI writing and keeps its template. */
  AGENT_MAX_AGE_SECONDS: boundedInt(
    ENV_LIMITS.agentMaxAgeMinSeconds,
    ENV_LIMITS.agentMaxAgeMaxSeconds,
    ENV_LIMITS.agentMaxAgeDefaultSeconds,
  ),
  /** First retry delay; BullMQ doubles it on each further attempt. */
  AGENT_RETRY_BACKOFF_MS: boundedInt(
    ENV_LIMITS.agentRetryBackoffMinMs,
    ENV_LIMITS.agentRetryBackoffMaxMs,
    ENV_LIMITS.agentRetryBackoffDefaultMs,
  ),
  AGENT_CIRCUIT_COOLDOWN_MS: boundedInt(
    ENV_LIMITS.agentCircuitCooldownMinMs,
    ENV_LIMITS.agentCircuitCooldownMaxMs,
    ENV_LIMITS.agentCircuitCooldownDefaultMs,
  ),
  ...DemoFaultFields,
}).superRefine(checkDemoFaults);

export const WebPublicEnv = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url().default(DEFAULT_URLS.apiBase),
  NEXT_PUBLIC_DEMO_MODE: booleanFlag,
  /** The OIDC issuer as the browser reaches it (sign-in redirects, CSP); not a secret. */
  NEXT_PUBLIC_OIDC_ISSUER_URL: optionalUrl,
});

export type LogLevel = z.infer<typeof LogLevel>;
export type CommonEnv = z.infer<typeof CommonEnv>;
export type DatabaseEnv = z.infer<typeof DatabaseEnv>;
export type ApiEnv = z.infer<typeof ApiEnv>;
export type WorkerEnv = z.infer<typeof WorkerEnv>;
export type WebPublicEnv = z.infer<typeof WebPublicEnv>;
