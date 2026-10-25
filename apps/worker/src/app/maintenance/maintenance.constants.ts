export const RETENTION_BATCH = {
  /** Sessions deleted per transaction (each holds about 5k dependent rows). */
  sessions: 10,
  idempotencyKeys: 1_000,
  /** Bounds one run; the next run continues where this one stopped. */
  maxBatchesPerRun: 100,
} as const;

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export const RECOVERY = {
  /** PENDING insights re-examined per boot, oldest first. */
  scanLimit: 1_000,
} as const;

export const RECOVERY_REASONS = {
  expired:
    'recovered after a worker restart past the agents deadline, templates published',
  aiDisabled:
    'recovered after a worker restart with AI disabled, templates published',
} as const;

export const MAINTENANCE_LOG = {
  retentionFailed: (reason: string) => `Retention run failed: ${reason}`,
  retentionSkipped: 'Retention run skipped: another replica holds the lock',
  retentionDone: (sessions: number, keys: number) =>
    `Retention removed ${sessions} session(s) and ${keys} idempotency key(s)`,
  recoveryFailed: (reason: string) =>
    `Pending insight recovery failed: ${reason}`,
  recovered: (requeued: number, fallbacks: number) =>
    `Recovered PENDING insights: ${requeued} re-enqueued, ${fallbacks} published from templates`,
} as const;

export const RETENTION_AUDIT_TARGET = 'worker';
