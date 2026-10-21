import { z } from 'zod';
import {
  CSV_SEPARATOR,
  DEFAULT_APP_VERSION,
  DEFAULT_DEMO_ORG_ID,
  DEFAULT_PORTS,
  DEFAULT_URLS,
  ENV_LIMITS,
  ENV_PATTERNS,
} from './constants.js';

const booleanFlag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const port = (fallback: number) =>
  z.coerce.number().int().min(1).max(ENV_LIMITS.portMax).default(fallback);

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(CSV_SEPARATOR)
      .map((s) => s.trim())
      .filter(Boolean),
  );

const secret = z.string().min(ENV_LIMITS.secretMinLength);
const postgresUrl = z.url({ protocol: ENV_PATTERNS.postgresProtocol });
const redisUrl = z.url({ protocol: ENV_PATTERNS.redisProtocol });

export const AppEnvironment = z.enum(['local', 'test', 'dev', 'stage', 'prod']);
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
  OTEL_SERVICE_NAME: z.string().min(1).optional(),
  APPLICATIONINSIGHTS_CONNECTION_STRING: z.string().min(1).optional(),
});

export const ApiEnv = CommonEnv.extend({
  API_PORT: port(DEFAULT_PORTS.api),
  API_PUBLIC_URL: z.url().default(DEFAULT_URLS.apiPublic),
  CORS_ALLOWED_ORIGINS: csv,
  RATE_LIMIT_PER_MINUTE: z.coerce
    .number()
    .int()
    .positive()
    .default(ENV_LIMITS.rateLimitPerMinute),
  DATABASE_URL: postgresUrl,
  REDIS_URL: redisUrl,
  /** Bearer secret for operator-only endpoints until Entra ID is wired. */
  OPERATOR_API_KEY: secret,
});

export const WorkerEnv = CommonEnv.extend({
  WORKER_PORT: port(DEFAULT_PORTS.worker),
  DATABASE_URL: postgresUrl,
  REDIS_URL: redisUrl,
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
});

export const WebPublicEnv = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url().default(DEFAULT_URLS.apiBase),
  NEXT_PUBLIC_DEMO_MODE: booleanFlag,
});

export type AppEnvironment = z.infer<typeof AppEnvironment>;
export type LogLevel = z.infer<typeof LogLevel>;
export type CommonEnv = z.infer<typeof CommonEnv>;
export type ApiEnv = z.infer<typeof ApiEnv>;
export type WorkerEnv = z.infer<typeof WorkerEnv>;
export type WebPublicEnv = z.infer<typeof WebPublicEnv>;
