import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { Fixture, Insight } from '@matchiq/contracts';
import {
  DB_LIMITS,
  type FixtureKey,
  type InsightRecord,
  type ReplayCommandJob,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { FALLBACK_REASONS, LOG_MESSAGES, REPLAY_RUNTIME } from '../constants';
import type { SessionRuntime } from '../infrastructure/bundles';
import { SESSION_RUNTIME, SESSION_SOURCES } from '../infrastructure/tokens';
import { MatchPipeline } from '../pipeline/match-pipeline';
import {
  appendPublication,
  emptyBatch,
  type PipelineBatch,
} from '../pipeline/pipeline-batch';
import { templatePublication, type Publication } from '../pipeline/publication';
import { RecapService } from '../recap/recap.service';
import { PipelineWriter, type WriteOutcome } from './pipeline-writer';
import { loadSession, type SessionSources } from './session-loader';
import { SessionRunner } from './session-runner';

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const RESUMABLE = new Set(['PLAYING', 'PAUSED']);

export interface PublishInput {
  readonly insight: Insight;
  readonly publication: Publication;
  readonly claim: 'AGENT' | 'TEMPLATE';
}

/**
 * Owns every active replay session in this worker (one worker replica, see
 * ADR-0013). Commands arrive from the API through the command queue, agent
 * publications from the pipeline jobs; both are serialised per session.
 */
@Injectable()
export class SessionManager
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(SessionManager.name);
  private readonly runners = new Map<string, SessionRunner>();
  private readonly fixtures = new Map<string, Fixture>();
  private readonly writer: PipelineWriter;

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(SESSION_SOURCES) private readonly sources: SessionSources,
    @Inject(SESSION_RUNTIME) private readonly runtime: SessionRuntime,
    private readonly recaps: RecapService,
  ) {
    this.writer = new PipelineWriter(sources.uow);
  }

  /** Resumes sessions that were playing or paused when the worker last stopped. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.resumeSessions();
    } catch (error) {
      // Readiness reports the dependency; the worker stays up to serve health.
      this.logger.warn(LOG_MESSAGES.resumeFailed(describe(error)));
    }
  }

  private async resumeSessions(): Promise<void> {
    const orgId = this.env.DEMO_ORG_ID;
    const sessions = await this.sources.sessions.list(
      orgId,
      DB_LIMITS.sessionListMax,
    );
    for (const session of sessions) {
      if (!RESUMABLE.has(session.status.state)) continue;
      const key = { orgId, fixtureId: session.sessionId };
      const runner = await this.runnerFor(key);
      if (session.status.state === 'PLAYING') {
        runner?.command({ action: 'resume' });
      }
    }
  }

  onApplicationShutdown(): void {
    for (const runner of this.runners.values()) runner.dispose();
    this.runners.clear();
  }

  async handle(job: ReplayCommandJob): Promise<void> {
    const key = { orgId: job.orgId, fixtureId: job.fixtureId };
    const runner = await this.runnerFor(key);
    if (runner === null) {
      this.logger.warn(LOG_MESSAGES.unknownSession(key.fixtureId));
      return;
    }
    const result = runner.command(job.command);
    if (!result.ok) {
      this.logger.warn(
        LOG_MESSAGES.commandRejected(key.fixtureId, result.error.message),
      );
    }
  }

  /** Routes a gated publication through the session's serial queue while it is loaded. */
  async publish(key: FixtureKey, input: PublishInput): Promise<WriteOutcome> {
    const runner = this.runners.get(key.fixtureId);
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
    await this.runners.get(fixtureId)?.whenIdle();
  }

  private now(): string {
    return this.runtime.clock.now().toISOString();
  }

  private activeCount(): number {
    return [...this.runners.values()].filter(
      (r) => r.status.state !== 'COMPLETED',
    ).length;
  }

  private async runnerFor(key: FixtureKey): Promise<SessionRunner | null> {
    const existing = this.runners.get(key.fixtureId);
    if (existing) return existing;
    if (this.activeCount() >= this.env.REPLAY_MAX_ACTIVE_SESSIONS) return null;
    const loaded = await loadSession(this.sources, key);
    if (loaded === null) return null;
    const runner = new SessionRunner({
      key,
      events: loaded.events,
      pipeline: new MatchPipeline({
        fixture: loaded.fixture,
        aiEnabled: this.env.AI_ENABLED,
        now: () => this.now(),
      }),
      writer: this.writer,
      scheduler: this.runtime.scheduler,
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
      runner.rehydrate(loaded.ledgerHead);
      this.logger.log(LOG_MESSAGES.resumed(key.fixtureId, loaded.ledgerHead));
    }
    this.runners.set(key.fixtureId, runner);
    this.fixtures.set(key.fixtureId, loaded.fixture);
    return runner;
  }

  private async afterWrite(
    key: FixtureKey,
    batch: PipelineBatch,
  ): Promise<void> {
    this.runtime.outbox.notify();
    for (const record of batch.insights) this.enqueuePending(key, record);
    const sessionCompleted =
      this.runners.get(key.fixtureId)?.status.state === 'COMPLETED';
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
    const fixture = this.fixtures.get(key.fixtureId);
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
      const runner = this.runners.get(fixtureId);
      if (runner?.status.state !== 'COMPLETED') return;
      runner.dispose();
      this.runners.delete(fixtureId);
      this.fixtures.delete(fixtureId);
    }, REPLAY_RUNTIME.completedRetentionMs).unref();
  }

  private onFailure(key: FixtureKey, error: unknown): void {
    this.logger.error(
      LOG_MESSAGES.sessionFailed(key.fixtureId, describe(error)),
    );
    this.runners.get(key.fixtureId)?.dispose();
    this.runners.delete(key.fixtureId);
  }
}
