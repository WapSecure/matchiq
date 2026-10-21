import { Inject, Injectable } from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { Fixture, Insight } from '@matchiq/contracts';
import type { InsightPipelineJob } from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { FALLBACK_REASONS } from '../constants';
import type { AgentPipelineDeps } from '../infrastructure/bundles';
import { AGENT_PIPELINE_DEPS } from '../infrastructure/tokens';
import { buildPipelineRequest } from '../pipeline/pipeline-request';
import {
  agentPublication,
  templatePublication,
  type Publication,
} from '../pipeline/publication';
import { SessionManager } from '../replay/session-manager.service';
import type { WriteOutcome } from '../replay/pipeline-writer';
import { AgentsCallError } from './agents-client';
import { CircuitBreaker } from './circuit-breaker';

export interface JobAttempt {
  /** Attempts already made before this one (BullMQ `attemptsMade`). */
  readonly attemptsMade: number;
  readonly maxAttempts: number;
}

export type JobOutcome = WriteOutcome | 'skipped';

interface Decided {
  readonly publication: Publication;
  readonly claim: 'AGENT' | 'TEMPLATE';
}

/**
 * Runs the agents pipeline for one insight and hands the gated result to the
 * session. A retriable failure rethrows while attempts remain (BullMQ backs
 * off); the last failure, an open circuit or a non-retriable error publishes
 * the deterministic templates instead. Publication is claimed in the write
 * transaction, so an at-least-once redelivery never publishes twice.
 */
@Injectable()
export class InsightPipelineService {
  private readonly breaker: CircuitBreaker;

  constructor(
    @Inject(APP_ENV) private readonly env: WorkerEnv,
    @Inject(AGENT_PIPELINE_DEPS) private readonly deps: AgentPipelineDeps,
    private readonly sessions: SessionManager,
  ) {
    this.breaker = new CircuitBreaker({
      failureThreshold: env.AGENT_CIRCUIT_FAILURE_THRESHOLD,
      cooldownMs: env.AGENT_CIRCUIT_COOLDOWN_MS,
      now: () => deps.clock.now().getTime(),
    });
  }

  get circuitState(): CircuitBreaker['state'] {
    return this.breaker.state;
  }

  async process(
    job: InsightPipelineJob,
    attempt: JobAttempt,
  ): Promise<JobOutcome> {
    const key = { orgId: job.orgId, fixtureId: job.fixtureId };
    const [pending, fixture] = await Promise.all([
      this.deps.reader.pendingInsight(key, job.insightId),
      this.deps.fixtures.get(key),
    ]);
    if (pending === null || fixture === null) return 'skipped';
    const decided = await this.decide({
      insight: pending,
      fixture,
      job,
      attempt,
    });
    return this.sessions.publish(key, { insight: pending, ...decided });
  }

  private async decide(input: {
    insight: Insight;
    fixture: Fixture;
    job: InsightPipelineJob;
    attempt: JobAttempt;
  }): Promise<Decided> {
    const { insight, fixture, job, attempt } = input;
    const createdAt = this.deps.clock.now().toISOString();
    const fallback = (reason: string): Decided => ({
      claim: 'TEMPLATE',
      publication: templatePublication({
        insight,
        fixture,
        createdAt,
        reason,
        retries: attempt.attemptsMade,
      }),
    });
    if (!this.env.AI_ENABLED) return fallback(FALLBACK_REASONS.aiDisabled);
    if (!this.breaker.tryAcquire())
      return fallback(FALLBACK_REASONS.circuitOpen);
    try {
      const result = await this.deps.client.run(
        buildPipelineRequest({
          orgId: job.orgId,
          fixture,
          insight,
          revision: job.revision,
          deadlineMs: this.env.AGENT_TIMEOUT_MS,
        }),
      );
      this.breaker.recordSuccess();
      const publication = agentPublication({
        insight,
        fixture,
        result,
        createdAt,
      });
      return {
        publication,
        claim:
          publication.completion.status === 'PUBLISHED' ? 'AGENT' : 'TEMPLATE',
      };
    } catch (error) {
      this.breaker.recordFailure();
      const call = error instanceof AgentsCallError ? error : null;
      const lastAttempt = attempt.attemptsMade + 1 >= attempt.maxAttempts;
      if (call?.retriable === true && !lastAttempt) throw error;
      return fallback(call?.message ?? FALLBACK_REASONS.unreachable);
    }
  }
}
