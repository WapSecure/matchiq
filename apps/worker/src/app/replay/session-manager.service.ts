import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { Insight, ReplayCommand } from '@matchiq/contracts';
import type { FixtureKey, InsightRecord, ReplayCommandJob } from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { FALLBACK_REASONS, LOG_MESSAGES, REPLAY_RUNTIME } from '../constants';
import type { SessionRuntime } from '../infrastructure/bundles';
import { SESSION_RUNTIME, SESSION_SOURCES } from '../infrastructure/tokens';
import { createRunner } from './runner-factory';
import {
  appendPublication,
  emptyBatch,
  type PipelineBatch,
} from '../pipeline/pipeline-batch';
import { templatePublication, type Publication } from '../pipeline/publication';
import { RecapService } from '../recap/recap.service';
import { recordCapacityRejection } from './capacity-rejection';
import { PipelineWriter, type WriteOutcome } from './pipeline-writer';
import {
  CAPACITY_LOG,
  SESSION_LIFECYCLE,
  SLOT_ACTIONS,
  sweepIntervalMs,
} from './replay.constants';
import { loadSession, type SessionSources } from './session-loader';
import { SessionRegistry } from './session-registry';
import type { SessionRunner } from './session-runner';

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface PublishInput {
  readonly insight: Insight;
  readonly publication: Publication;
  readonly claim: 'AGENT' | 'TEMPLATE';
}

/**
 * Owns every loaded replay session in this worker (one worker replica, see
 * ADR-0013). Commands arrive from the API through the command queue, agent
 * publications from the pipeline jobs; both are serialised per session.
 * Capacity (ADR-0015): only PLAYING or about-to-start runners hold a slot;
 * untouched non-playing runners leave memory after `REPLAY_IDLE_TIMEOUT_MS`
 * and reload from the ledger on their next command.
 */
@Injectable()
export class SessionManager
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SessionManager.name);
  private readonly registry: SessionRegistry;
  private readonly writer: PipelineWriter;
  private sweep: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(SESSION_SOURCES) private readonly sources: SessionSources,
    @Inject(SESSION_RUNTIME) private readonly runtime: SessionRuntime,
    private readonly recaps: RecapService,
  ) {
    this.writer = new PipelineWriter(sources.uow);
    this.registry = new SessionRegistry(() => runtime.scheduler.now());
  }

  async onApplicationBootstrap(): Promise<void> {
    const period = sweepIntervalMs(this.env.REPLAY_IDLE_TIMEOUT_MS);
    this.sweep = setInterval(() => this.evictIdle(), period).unref();
    try {
      await this.resumeSessions();
    } catch (error) {
      // Readiness reports the dependency; the worker stays up to serve health.
      this.logger.warn(LOG_MESSAGES.resumeFailed(describe(error)));
    }
  }

  /**
   * Resumes the sessions that were PLAYING when the worker stopped, up to the
   * slot limit; the rest are paused durably. PAUSED sessions load on demand.
   */
  private async resumeSessions(): Promise<void> {
    const max = this.env.REPLAY_MAX_ACTIVE_SESSIONS;
    const playing = await this.sources.sessions.listInState(
      this.env.DEMO_ORG_ID,
      'PLAYING',
      SESSION_LIFECYCLE.resumeScanLimit,
    );
    for (const key of playing) {
      const runner = await this.runnerFor(key);
      if (runner === null) continue;
      if (this.registry.activeCount(key.fixtureId) < max) {
        runner.command({ action: 'resume' });
      } else {
        runner.announce();
        this.logger.warn(CAPACITY_LOG.pausedAtBoot(key.fixtureId, max));
      }
    }
  }

  onApplicationShutdown(): void {
    if (this.sweep !== null) clearInterval(this.sweep);
    this.registry.clear();
  }

  /** Releases idle, non-playing runners; their state stays in the database. */
  evictIdle(): number {
    const idle = this.registry.idle(this.env.REPLAY_IDLE_TIMEOUT_MS);
    for (const fixtureId of idle) this.registry.remove(fixtureId);
    if (idle.length > 0) this.logger.log(CAPACITY_LOG.evicted(idle.length));
    return idle.length;
  }

  /** Drops a runner without waiting for the idle timeout (retention purges). */
  release(fixtureId: string): void {
    this.registry.remove(fixtureId);
  }

  isLoaded(fixtureId: string): boolean {
    return this.registry.runner(fixtureId) !== undefined;
  }

  async handle(job: ReplayCommandJob): Promise<void> {
    const key = { orgId: job.orgId, fixtureId: job.fixtureId };
    const runner = await this.runnerFor(key);
    if (runner === null) {
      this.logger.warn(LOG_MESSAGES.unknownSession(key.fixtureId));
      return;
    }
    this.registry.touch(key.fixtureId);
    if (await this.refusedForCapacity(key, runner, job.command)) return;
    const result = runner.command(job.command);
    if (!result.ok) {
      this.logger.warn(
        LOG_MESSAGES.commandRejected(key.fixtureId, result.error.message),
      );
    }
  }

  private async refusedForCapacity(
    key: FixtureKey,
    runner: SessionRunner,
    command: ReplayCommand,
  ): Promise<boolean> {
    if (!SLOT_ACTIONS.has(command.action) || runner.status.state === 'PLAYING')
      return false;
    const max = this.env.REPLAY_MAX_ACTIVE_SESSIONS;
    const active = this.registry.activeCount(key.fixtureId);
    if (active < max) return false;
    this.logger.warn(
      CAPACITY_LOG.rejected(key.fixtureId, command.action, active, max),
    );
    await runner.whenIdle();
    await recordCapacityRejection(this.sources.uow, {
      key,
      status: runner.status,
      command,
      active,
      max,
      emittedAt: this.now(),
    });
    this.runtime.outbox.notify();
    return true;
  }

  /** Routes a gated publication through the session's serial queue while it is loaded. */
  async publish(key: FixtureKey, input: PublishInput): Promise<WriteOutcome> {
    const runner = this.registry.runner(key.fixtureId);
    if (runner && !runner.isFailed) return runner.submitPublication(input);
    const batch = emptyBatch();
    batch.claims.push({
      insightId: input.insight.insightId,
      publication: input.claim,
    });
    appendPublication(
      { fixtureId: key.fixtureId, ...input, now: () => this.now() },
      batch,
    );
    const outcome = await this.writer.write(key, batch);
    if (outcome === 'written') await this.afterWrite(key, batch);
    return outcome;
  }

  /** Resolves when the session has written everything queued so far. */
  async whenIdle(fixtureId: string): Promise<void> {
    await this.registry.runner(fixtureId)?.whenIdle();
  }

  private now(): string {
    return this.runtime.clock.now().toISOString();
  }

  private async runnerFor(key: FixtureKey): Promise<SessionRunner | null> {
    const existing = this.registry.runner(key.fixtureId);
    if (existing) return existing;
    const loaded = await loadSession(this.sources, key);
    if (loaded === null) return null;
    const runner = createRunner({
      key,
      loaded,
      aiEnabled: this.env.AI_ENABLED,
      writer: this.writer,
      scheduler: this.runtime.scheduler,
      now: () => this.now(),
      hooks: {
        afterWrite: (k, batch) => this.afterWrite(k, batch),
        onFailure: (k, error) => this.onFailure(k, error),
        onHookError: (k, error) =>
          this.logger.warn(
            LOG_MESSAGES.hookFailed(k.fixtureId, describe(error)),
          ),
      },
    });
    if (loaded.ledgerHead >= 0) {
      this.logger.log(LOG_MESSAGES.resumed(key.fixtureId, loaded.ledgerHead));
    }
    this.registry.add(key.fixtureId, runner, loaded.fixture);
    return runner;
  }

  private async afterWrite(
    key: FixtureKey,
    batch: PipelineBatch,
  ): Promise<void> {
    this.runtime.outbox.notify();
    this.registry.touch(key.fixtureId);
    for (const record of batch.insights) this.enqueuePending(key, record);
    const sessionCompleted =
      this.registry.runner(key.fixtureId)?.status.state === 'COMPLETED';
    if (
      batch.matchEnded ||
      (sessionCompleted && batch.completions.length > 0)
    ) {
      await this.recaps.rebuild(key);
    }
    if (batch.status?.state === 'COMPLETED')
      this.scheduleEviction(key.fixtureId);
  }

  /** Not awaited: a fallback publication joins the session queue behind the current batch. */
  private enqueuePending(key: FixtureKey, record: InsightRecord): void {
    if (record.publication !== 'PENDING') return;
    const job = {
      ...key,
      insightId: record.insight.insightId,
      revision: record.revision,
    };
    this.runtime.jobs
      .enqueue(job)
      .catch(() => this.publishFallback(key, record.insight));
  }

  private publishFallback(key: FixtureKey, insight: Insight): void {
    const fixture = this.registry.fixture(key.fixtureId);
    if (fixture === undefined) return;
    const publication = templatePublication({
      insight,
      fixture,
      createdAt: this.now(),
      reason: FALLBACK_REASONS.enqueueFailed,
    });
    this.publish(key, { insight, publication, claim: 'TEMPLATE' }).catch(
      (error: unknown) =>
        this.logger.warn(
          LOG_MESSAGES.hookFailed(key.fixtureId, describe(error)),
        ),
    );
  }

  private scheduleEviction(fixtureId: string): void {
    setTimeout(() => {
      const runner = this.registry.runner(fixtureId);
      if (runner?.status.state === 'COMPLETED') this.registry.remove(fixtureId);
    }, REPLAY_RUNTIME.completedRetentionMs).unref();
  }

  private onFailure(key: FixtureKey, error: unknown): void {
    this.logger.error(
      LOG_MESSAGES.sessionFailed(key.fixtureId, describe(error)),
    );
    this.registry.remove(key.fixtureId);
  }
}
