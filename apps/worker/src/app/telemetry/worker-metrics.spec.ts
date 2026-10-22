import type { AgentRun } from '@matchiq/contracts';
import type {
  InsightCompletion,
  PipelineTransaction,
  PipelineUnitOfWork,
} from '@matchiq/db';
import { Registry } from '@matchiq/server-kit';
import { meteredUnitOfWork } from './metered-unit-of-work';
import { WORKER_METRICS } from './telemetry.constants';
import { WorkerMetrics } from './worker-metrics';

const run = (
  outcome: AgentRun['outcome'],
  provider: AgentRun['provider'],
): AgentRun => ({
  runId: 'run_1',
  correlationId: 'corr_1',
  agent: 'NARRATIVE_WRITER',
  provider,
  promptVersion: '1.0.0',
  startedAt: '2026-10-22T12:00:00.000Z',
  latencyMs: 1_500,
  retries: 0,
  outcome,
});

const completion: InsightCompletion = {
  status: 'FALLBACK',
  fallbackReason: 'agents service timed out',
  gateReport: {
    source: 'TEMPLATE',
    publishedNarratives: 12,
    templateNarratives: 12,
    overlayRevision: null,
    rejected: [
      {
        item: 'NARRATIVE',
        source: 'AGENT',
        persona: 'CASUAL',
        locale: 'en-GB',
        codes: ['UNSUPPORTED_NUMBER', 'UNKNOWN_ENTITY'],
        details: ['number 7 is not a cited value'],
      },
    ],
  },
};

/** A transaction double recording calls, standing in for Postgres. */
const fakeUow = (fail = false): PipelineUnitOfWork => ({
  transaction: async (work) => {
    const tx = {
      completeInsight: async () => undefined,
      insertAgentRuns: async () => undefined,
    } as unknown as PipelineTransaction;
    const result = await work(tx);
    if (fail) throw new Error('rolled back');
    return result;
  },
});

describe('worker metrics', () => {
  let registry: Registry;
  let metrics: WorkerMetrics;

  beforeEach(() => {
    registry = new Registry();
    metrics = new WorkerMetrics(registry);
  });

  it('registers every series in the catalogue', async () => {
    const names = (await registry.getMetricsAsJSON()).map((m) => m.name);
    for (const key of [
      'agentRuns',
      'agentRunSeconds',
      'pipelineCalls',
      'completions',
      'gateRejections',
      'transactions',
      'jobs',
      'retention',
    ] as const) {
      expect(names).toContain(WORKER_METRICS.names[key]);
    }
  });

  it('counts agent runs, completions and gate rejections only after commit', async () => {
    const uow = meteredUnitOfWork(fakeUow(), metrics);
    await uow.transaction(async (tx) => {
      await tx.completeInsight(
        { orgId: 'org_demo', fixtureId: 'fx_1' },
        'in_1',
        completion,
      );
      await tx.insertAgentRuns(
        { orgId: 'org_demo', fixtureId: 'fx_1' },
        'in_1',
        [run('TIMED_OUT', 'ollama'), run('FALLBACK', 'template')],
      );
    });
    const text = await registry.metrics();
    expect(text).toContain(
      'matchiq_agent_runs_total{agent="NARRATIVE_WRITER",provider="ollama",outcome="TIMED_OUT"} 1',
    );
    expect(text).toContain(
      'matchiq_agent_runs_total{agent="NARRATIVE_WRITER",provider="template",outcome="FALLBACK"} 1',
    );
    expect(text).toContain(
      'matchiq_agent_run_duration_seconds_sum{agent="NARRATIVE_WRITER",provider="ollama",outcome="TIMED_OUT"} 1.5',
    );
    expect(text).toContain(
      'matchiq_insight_completions_total{status="FALLBACK",source="TEMPLATE"} 1',
    );
    expect(text).toContain(
      'matchiq_gate_rejections_total{item="NARRATIVE",source="AGENT",code="UNSUPPORTED_NUMBER"} 1',
    );
    expect(text).toContain('matchiq_pipeline_commit_duration_seconds_count 1');
    expect(text).not.toMatch(/fx_1|in_1|corr_1/);
  });

  it('records nothing for a transaction that rolls back', async () => {
    const uow = meteredUnitOfWork(fakeUow(true), metrics);
    await expect(
      uow.transaction(async (tx) => {
        await tx.completeInsight(
          { orgId: 'org_demo', fixtureId: 'fx_1' },
          'in_1',
          completion,
        );
      }),
    ).rejects.toThrow('rolled back');
    const text = await registry.metrics();
    expect(text).not.toContain('matchiq_insight_completions_total{');
    expect(text).toContain('matchiq_pipeline_commit_duration_seconds_count 0');
  });

  it('labels pipeline calls, job durations and retention by bounded values', async () => {
    metrics.pipelineCall('timeout', 8);
    metrics.pipelineCall('ai-disabled', 0);
    metrics.job('insight-pipeline', 'failed', 2);
    metrics.retained({ sessions: 2, events: 0, idempotencyKeys: 5 });
    const text = await registry.metrics();
    expect(text).toContain(
      'matchiq_agent_pipeline_call_duration_seconds_count{outcome="timeout"} 1',
    );
    expect(text).toContain(
      'matchiq_agent_pipeline_call_duration_seconds_count{outcome="ai-disabled"} 1',
    );
    expect(text).toContain(
      'matchiq_queue_job_duration_seconds_count{queue="insight-pipeline",outcome="failed"} 1',
    );
    expect(text).toContain(
      'matchiq_retention_deleted_total{kind="sessions"} 2',
    );
    expect(text).toContain(
      'matchiq_retention_deleted_total{kind="idempotencyKeys"} 5',
    );
    expect(text).not.toContain('kind="events"');
  });
});
