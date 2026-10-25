import { Inject, Injectable } from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type {
  FaultScenario,
  Fixture,
  Insight,
  PipelineResult,
} from '@matchiq/contracts';
import type { FixtureKey, InsightPipelineJob } from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { FALLBACK_REASONS, TEMPLATE_ONLY_KINDS } from '../constants';
import type { AgentPipelineDeps } from '../infrastructure/bundles';
import { AGENT_PIPELINE_DEPS } from '../infrastructure/tokens';
import { recentNarratives } from '../pipeline/gate/recent-narratives';
import { buildPipelineRequest } from '../pipeline/pipeline-request';
import {
  agentPublication,
  templatePublication,
  type Publication,
} from '../pipeline/publication';
import { SessionManager } from '../replay/session-manager.service';
import type { WriteOutcome } from '../replay/pipeline-writer';
import { AgentsCallError } from './agents-client';
import {
  type PipelineCallOutcome,
  WorkerMetrics,
} from '../telemetry/worker-metrics';
import { CircuitBreaker } from './circuit-breaker';
import { faultFor, tamperForGate } from './demo-faults';

export interface JobAttempt {
  /** Attempts already made before this one (BullMQ `attemptsMade`). */
  readonly attemptsMade: number;
  readonly maxAttempts: number;
  /** Wall-clock time the job was queued; stale moments skip AI writing. */
  readonly enqueuedAtMs?: number;
}

export type JobOutcome = WriteOutcome | 'skipped';

type SkipOutcome = Extract<
  PipelineCallOutcome,
  'ai-disabled' | 'circuit-open' | 'stale' | 'template-only'
>;

const SKIP_REASONS: Readonly<Record<SkipOutcome, string>> = {
  'ai-disabled': FALLBACK_REASONS.aiDisabled,
  'circuit-open': FALLBACK_REASONS.circuitOpen,
  stale: FALLBACK_REASONS.skippedStale,
  'template-only': FALLBACK_REASONS.templateOnly,
};

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
    private readonly metrics: WorkerMetrics,
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
      fault: await this.faultOf(key, pending.insightId),
    });
    return this.sessions.publish(key, { insight: pending, ...decided });
  }

  private isStale(attempt: JobAttempt): boolean {
    if (attempt.enqueuedAtMs === undefined) return false;
    const ageMs = this.deps.clock.now().getTime() - attempt.enqueuedAtMs;
    return ageMs > this.env.AGENT_MAX_AGE_SECONDS * 1_000;
  }

  private skipReason(
    attempt: JobAttempt,
    insight: Insight,
  ): SkipOutcome | null {
    if (!this.env.AI_ENABLED) return 'ai-disabled';
    if (TEMPLATE_ONLY_KINDS.includes(insight.kind)) return 'template-only';
    if (this.isStale(attempt)) return 'stale';
    return this.breaker.tryAcquire() ? null : 'circuit-open';
  }

  private async decide(input: {
    insight: Insight;
    fixture: Fixture;
    job: InsightPipelineJob;
    attempt: JobAttempt;
    fault: FaultScenario | undefined;
  }): Promise<Decided> {
    const { insight, fixture, attempt } = input;
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
    const skipped = this.skipReason(attempt, insight);
    if (skipped !== null) {
      this.metrics.pipelineCall(skipped, 0);
      return fallback(SKIP_REASONS[skipped]);
    }
    const started = performance.now();
    const elapsed = () => (performance.now() - started) / 1_000;
    try {
      const result = await this.callAgents(input);
      this.breaker.recordSuccess();
      this.metrics.pipelineCall('success', elapsed());
      const publication = agentPublication({
        insight,
        fixture,
        result,
        createdAt,
        recent: await this.recentFor(input.job, insight.insightId),
      });
      return {
        publication,
        claim:
          publication.completion.status === 'PUBLISHED' ? 'AGENT' : 'TEMPLATE',
      };
    } catch (error) {
      this.breaker.recordFailure();
      const call = error instanceof AgentsCallError ? error : null;
      this.metrics.pipelineCall(call?.kind ?? 'unreachable', elapsed());
      const lastAttempt = attempt.attemptsMade + 1 >= attempt.maxAttempts;
      if (call?.retriable === true && !lastAttempt) throw error;
      return fallback(call?.message ?? FALLBACK_REASONS.unreachable);
    }
  }

  private async callAgents(input: {
    insight: Insight;
    fixture: Fixture;
    job: InsightPipelineJob;
    fault: FaultScenario | undefined;
  }): Promise<PipelineResult> {
    const { fault, job } = input;
    const answer = await this.deps.client.run(
      buildPipelineRequest({
        orgId: job.orgId,
        fixture: input.fixture,
        insight: input.insight,
        revision: job.revision,
        deadlineMs: this.env.AGENT_TIMEOUT_MS,
        ...(fault && { fault }),
      }),
    );
    return fault === 'GATE_REJECT' ? tamperForGate(answer) : answer;
  }

  private async recentFor(job: InsightPipelineJob, insightId: string) {
    const key = { orgId: job.orgId, fixtureId: job.fixtureId };
    const [narratives, insights] = await Promise.all([
      this.deps.reader.narratives(key, {}),
      this.deps.reader.insightsWithPeriod(key),
    ]);
    return recentNarratives(narratives, insights, insightId);
  }

  /** Demo faults apply only where enabled, to sessions created with a plan. */
  private async faultOf(
    key: FixtureKey,
    insightId: string,
  ): Promise<FaultScenario | undefined> {
    if (!this.env.DEMO_FAULTS_ENABLED) return undefined;
    const session = await this.deps.sessions.get(key);
    if (session?.faultPlan === undefined) return undefined;
    const insights = await this.deps.reader.insights(key);
    return faultFor(session.faultPlan, insights, insightId);
  }
}
