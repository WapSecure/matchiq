import { z } from 'zod';
import { CSV_SEPARATOR } from './constants.js';
import {
  OPERATIONS_LIMITS,
  TRUST_PROXY_HOPS,
  TRUST_PROXY_MESSAGES,
  TRUST_PROXY_NAMES,
} from './operations-constants.js';

/** `false`, a hop count, or the trusted proxy addresses (Express `trust proxy`). */
export type TrustProxy = false | number | readonly string[];

const proxyAddress = z.union([
  z.ipv4(),
  z.ipv6(),
  z.cidrv4(),
  z.cidrv6(),
  z.enum(TRUST_PROXY_NAMES),
]);

const parseTrustProxy = (raw: string): TrustProxy | null => {
  const value = raw.trim();
  if (value === '' || value === 'false') return false;
  if (TRUST_PROXY_HOPS.test(value)) {
    const hops = Number(value);
    if (hops > OPERATIONS_LIMITS.trustProxyMaxHops) return null;
    return hops === 0 ? false : hops;
  }
  const entries = value
    .split(CSV_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = entries.every((e) => proxyAddress.safeParse(e).success);
  return valid && entries.length > 0 ? entries : null;
};

const trustProxy = z
  .string()
  .default('false')
  .transform((raw, ctx): TrustProxy => {
    const parsed = parseTrustProxy(raw);
    if (parsed !== null) return parsed;
    ctx.addIssue({ code: 'custom', message: TRUST_PROXY_MESSAGES.invalid });
    return z.NEVER;
  });

const bounded = (min: number, max: number, fallback: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

/** Read by the API (its 503 check) and the worker (its backstop and eviction). */
export const ReplayCapacityEnv = z.object({
  /** Sessions that may be PLAYING (or freshly created and about to start) at once. */
  REPLAY_MAX_ACTIVE_SESSIONS: bounded(
    1,
    OPERATIONS_LIMITS.replayActiveSessionsMax,
    OPERATIONS_LIMITS.replayActiveSessionsDefault,
  ),
  /** Untouched IDLE or PAUSED sessions stop holding a slot (and leave worker memory) after this. */
  REPLAY_IDLE_TIMEOUT_MS: bounded(
    OPERATIONS_LIMITS.replayIdleTimeoutMinMs,
    OPERATIONS_LIMITS.replayIdleTimeoutMaxMs,
    OPERATIONS_LIMITS.replayIdleTimeoutDefaultMs,
  ),
});

/** Wall-clock time a producer has to approve a waiting graphic (ADR-0024). */
export const ApprovalWindowEnv = z.object({
  APPROVAL_WINDOW_SECONDS: bounded(
    OPERATIONS_LIMITS.approvalWindowMinSeconds,
    OPERATIONS_LIMITS.approvalWindowMaxSeconds,
    OPERATIONS_LIMITS.approvalWindowDefaultSeconds,
  ),
});

export const TrustProxyEnv = z.object({ TRUST_PROXY: trustProxy });

/** Worker data retention (docs/operations/DATA_RETENTION.md). */
export const RetentionEnv = z.object({
  RETENTION_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SESSION_RETENTION_DAYS: bounded(
    1,
    OPERATIONS_LIMITS.sessionRetentionMaxDays,
    OPERATIONS_LIMITS.sessionRetentionDefaultDays,
  ),
  IDEMPOTENCY_RETENTION_HOURS: bounded(
    1,
    OPERATIONS_LIMITS.idempotencyRetentionMaxHours,
    OPERATIONS_LIMITS.idempotencyRetentionDefaultHours,
  ),
  RETENTION_INTERVAL_MS: bounded(
    OPERATIONS_LIMITS.retentionIntervalMinMs,
    OPERATIONS_LIMITS.retentionIntervalMaxMs,
    OPERATIONS_LIMITS.retentionIntervalDefaultMs,
  ),
});

/**
 * `GET /api/v1/openapi.json` and `/api/v1/docs`. Unset means on everywhere
 * except `APP_ENV=prod`; `true` or `false` overrides that.
 */
export const ApiDocsEnv = z.object({
  API_DOCS_ENABLED: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  ),
});

export const apiDocsEnabled = (env: {
  readonly APP_ENV: string;
  readonly API_DOCS_ENABLED?: boolean | undefined;
}): boolean => env.API_DOCS_ENABLED ?? env.APP_ENV !== 'prod';
