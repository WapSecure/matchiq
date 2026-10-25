import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { FixtureKey, PendingInsightRef } from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { AGENTS_HTTP, FALLBACK_REASONS } from '../constants';
import { templatePublication } from '../pipeline/publication';
import { RecapService } from '../recap/recap.service';
import { SessionManager } from '../replay/session-manager.service';
import {
  MAINTENANCE_LOG,
  RECOVERY,
  RECOVERY_REASONS,
} from './maintenance.constants';
import {
  MAINTENANCE_DEPS,
  type MaintenanceDeps,
} from './maintenance.providers';

export interface RecoveryReport {
  readonly requeued: number;
  readonly fallbacks: number;
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * The longest an insight can legitimately stay PENDING: every attempt's
 * deadline plus grace, and BullMQ's exponential backoff between attempts.
 */
export const agentsDeadlineMs = (env: WorkerEnv): number => {
  const attempts = env.AGENT_MAX_RETRIES + 1;
  const perAttempt = env.AGENT_TIMEOUT_MS + AGENTS_HTTP.deadlineGraceMs;
  const backoff = env.AGENT_RETRY_BACKOFF_MS * (2 ** env.AGENT_MAX_RETRIES - 1);
  return attempts * perAttempt + backoff;
};

/**
 * On boot, finishes insights a previous process left PENDING (a crash between
 * commit and enqueue, or a lost job). Within the agents deadline the job is
 * enqueued again, which BullMQ deduplicates by job id; past it, or with AI
 * disabled, the deterministic templates are published. Publication is claimed
 * in the write, so racing a live job never publishes twice.
 */
@Injectable()
export class InsightRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InsightRecoveryService.name);

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(MAINTENANCE_DEPS) private readonly deps: MaintenanceDeps,
    private readonly sessions: SessionManager,
    private readonly recaps: RecapService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const report = await this.recover();
      if (report.requeued + report.fallbacks > 0) {
        this.logger.log(
          MAINTENANCE_LOG.recovered(report.requeued, report.fallbacks),
        );
      }
    } catch (error) {
      this.logger.warn(MAINTENANCE_LOG.recoveryFailed(describe(error)));
    }
  }

  async recover(): Promise<RecoveryReport> {
    const pending = await this.deps.store.systemPendingInsights(
      RECOVERY.scanLimit,
    );
    const now = this.deps.clock.now().getTime();
    const deadline = agentsDeadlineMs(this.env);
    let requeued = 0;
    let fallbacks = 0;
    const touched = new Map<string, FixtureKey>();
    for (const ref of pending) {
      const reason = await this.requeueOrReason(
        ref,
        now - ref.createdAt.getTime() > deadline,
      );
      if (reason === null) requeued += 1;
      else if (await this.publishTemplates(ref, reason)) {
        fallbacks += 1;
        touched.set(`${ref.key.orgId}/${ref.key.fixtureId}`, ref.key);
      }
    }
    // A completed session's recap must include the narratives just published.
    for (const key of touched.values()) await this.recaps.rebuild(key);
    return { requeued, fallbacks };
  }

  /** Null once the job is enqueued again, else why templates are published instead. */
  private async requeueOrReason(
    ref: PendingInsightRef,
    expired: boolean,
  ): Promise<string | null> {
    if (!this.env.AI_ENABLED) return RECOVERY_REASONS.aiDisabled;
    if (expired) return RECOVERY_REASONS.expired;
    try {
      await this.deps.jobs.enqueue(
        {
          ...ref.key,
          insightId: ref.insight.insightId,
          revision: ref.revision,
        },
        ref.insight.priority,
      );
      return null;
    } catch {
      return FALLBACK_REASONS.enqueueFailed;
    }
  }

  private async publishTemplates(
    ref: PendingInsightRef,
    reason: string,
  ): Promise<boolean> {
    const fixture = await this.deps.fixtures.get(ref.key);
    if (fixture === null) return false;
    const publication = templatePublication({
      insight: ref.insight,
      fixture,
      createdAt: this.deps.clock.now().toISOString(),
      reason,
    });
    const outcome = await this.sessions.publish(ref.key, {
      insight: ref.insight,
      publication,
      claim: 'TEMPLATE',
    });
    return outcome === 'written';
  }
}
