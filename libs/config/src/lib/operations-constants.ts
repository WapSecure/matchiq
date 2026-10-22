export const OPERATIONS_LIMITS = {
  trustProxyMaxHops: 10,
  replayIdleTimeoutMinMs: 1_000,
  replayIdleTimeoutMaxMs: 86_400_000,
  replayIdleTimeoutDefaultMs: 600_000,
  replayActiveSessionsMax: 50,
  replayActiveSessionsDefault: 10,
  sessionRetentionMaxDays: 365,
  sessionRetentionDefaultDays: 7,
  idempotencyRetentionMaxHours: 720,
  idempotencyRetentionDefaultHours: 24,
  retentionIntervalMinMs: 1_000,
  retentionIntervalMaxMs: 86_400_000,
  retentionIntervalDefaultMs: 3_600_000,
} as const;

/** Express's named ranges for `trust proxy`. */
export const TRUST_PROXY_NAMES = [
  'loopback',
  'linklocal',
  'uniquelocal',
] as const;
export const TRUST_PROXY_HOPS = /^\d+$/;

export const TRUST_PROXY_MESSAGES = {
  invalid:
    'must be false, a hop count, or a comma-separated list of IPs, CIDRs or loopback|linklocal|uniquelocal (true is rejected: it trusts spoofed X-Forwarded-For)',
} as const;
