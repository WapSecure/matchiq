import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type RetentionCounts,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { SessionManager } from '../replay/session-manager.service';
import { WorkerMetrics } from '../telemetry/worker-metrics';
import {
  MAINTENANCE_LOG,
  MS_PER_DAY,
  MS_PER_HOUR,
  RETENTION_AUDIT_TARGET,
  RETENTION_BATCH,
} from './maintenance.constants';
import {
  MAINTENANCE_DEPS,
  type MaintenanceDeps,
} from './maintenance.providers';

export interface RetentionReport {
  readonly sessionCutoff: string;
  readonly idempotencyCutoff: string;
  readonly removed: RetentionCounts;
  readonly idempotencyKeys: number;
}

const ZERO: RetentionCounts = {
  sessions: 0,
  fixtures: 0,
  events: 0,
  streamMessages: 0,
  insights: 0,
  narratives: 0,
  overlays: 0,
  agentRuns: 0,
  snapshots: 0,
  recaps: 0,
};

const add = (a: RetentionCounts, b: RetentionCounts): RetentionCounts => {
  const sum = { ...a };
  for (const k of Object.keys(sum) as (keyof RetentionCounts)[]) {
    sum[k] = a[k] + b[k];
  }
  return sum;
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Data retention (docs/operations/DATA_RETENTION.md): replay sessions
 * untouched for `SESSION_RETENTION_DAYS` are deleted with every dependent row,
 * and idempotency keys older than `IDEMPOTENCY_RETENTION_HOURS` are pruned.
 * Templates and audit events are kept. Runs on an interval under a Postgres
 * advisory lock, so with several replicas only one deletes at a time.
 */
@Injectable()
export class RetentionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(RetentionService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running: Promise<unknown> | null = null;

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(MAINTENANCE_DEPS) private readonly deps: MaintenanceDeps,
    private readonly sessions: SessionManager,
    private readonly metrics: WorkerMetrics,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.env.RETENTION_ENABLED) return;
    const tick = () => {
      this.running ??= this.run()
        .catch((error: unknown) =>
          this.logger.warn(MAINTENANCE_LOG.retentionFailed(describe(error))),
        )
        .finally(() => {
          this.running = null;
        });
    };
    this.timer = setInterval(tick, this.env.RETENTION_INTERVAL_MS).unref();
    tick();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer !== null) clearInterval(this.timer);
    await this.running;
  }

  /** One pass; null when another process holds the retention lock. */
  async run(): Promise<RetentionReport | null> {
    const report = await this.deps.store.exclusive(() => this.purge());
    if (report === null) {
      this.logger.log(MAINTENANCE_LOG.retentionSkipped);
      return null;
    }
    this.metrics.retained({
      ...report.removed,
      idempotencyKeys: report.idempotencyKeys,
    });
    if (report.removed.sessions + report.idempotencyKeys > 0) {
      this.logger.log(
        MAINTENANCE_LOG.retentionDone(
          report.removed.sessions,
          report.idempotencyKeys,
        ),
      );
      await this.deps.store.audit({
        orgId: this.env.DEMO_ORG_ID,
        actor: AUDIT_ACTORS.retention,
        action: AUDIT_ACTIONS.retentionRun,
        targetType: AUDIT_TARGET_TYPES.retention,
        targetId: RETENTION_AUDIT_TARGET,
        details: { ...report },
      });
    }
    return report;
  }

  private async purge(): Promise<RetentionReport> {
    const now = this.deps.clock.now().getTime();
    const sessionCutoff = new Date(
      now - this.env.SESSION_RETENTION_DAYS * MS_PER_DAY,
    );
    const keyCutoff = new Date(
      now - this.env.IDEMPOTENCY_RETENTION_HOURS * MS_PER_HOUR,
    );
    let removed = ZERO;
    for (let i = 0; i < RETENTION_BATCH.maxBatchesPerRun; i += 1) {
      const keys = await this.deps.store.expiredSessions(
        sessionCutoff,
        RETENTION_BATCH.sessions,
      );
      if (keys.length === 0) break;
      for (const key of keys) this.sessions.release(key.fixtureId);
      removed = add(removed, await this.deps.store.deleteSessions(keys));
      if (keys.length < RETENTION_BATCH.sessions) break;
    }
    let idempotencyKeys = 0;
    for (let i = 0; i < RETENTION_BATCH.maxBatchesPerRun; i += 1) {
      const pruned = await this.deps.store.pruneIdempotencyKeys(
        keyCutoff,
        RETENTION_BATCH.idempotencyKeys,
      );
      idempotencyKeys += pruned;
      if (pruned < RETENTION_BATCH.idempotencyKeys) break;
    }
    return {
      sessionCutoff: sessionCutoff.toISOString(),
      idempotencyCutoff: keyCutoff.toISOString(),
      removed,
      idempotencyKeys,
    };
  }
}
