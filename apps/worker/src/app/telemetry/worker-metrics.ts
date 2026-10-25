import { Inject, Injectable } from '@nestjs/common';
import type { AgentRun } from '@matchiq/contracts';
import type { InsightCompletion } from '@matchiq/db';
import {
  Counter,
  Histogram,
  METRICS_REGISTRY,
  type Registry,
} from '@matchiq/server-kit';
import { WORKER_METRICS } from './telemetry.constants';

/** How one agents-pipeline call ended, as seen by the worker. */
export type PipelineCallOutcome =
  | 'success'
  | 'timeout'
  | 'unreachable'
  | 'http'
  | 'invalid-response'
  | 'circuit-open'
  | 'ai-disabled'
  | 'stale'
  | 'template-only';

const { names, help, buckets } = WORKER_METRICS;

/**
 * Worker counters and histograms. Every label is a bounded enum (agent,
 * provider, outcome, status, gate code, queue); ids never become labels.
 */
@Injectable()
export class WorkerMetrics {
  private readonly agentRuns: Counter<'agent' | 'provider' | 'outcome'>;
  private readonly agentRunSeconds: Histogram<'agent' | 'provider' | 'outcome'>;
  private readonly pipelineCalls: Histogram<'outcome'>;
  private readonly completions: Counter<'status' | 'source'>;
  private readonly gateRejections: Counter<'item' | 'source' | 'code'>;
  private readonly transactions: Histogram<never>;
  private readonly jobs: Histogram<'queue' | 'outcome'>;
  private readonly retention: Counter<'kind'>;

  constructor(@Inject(METRICS_REGISTRY) registry: Registry) {
    const registers = [registry];
    this.agentRuns = new Counter({
      name: names.agentRuns,
      help: help.agentRuns,
      labelNames: ['agent', 'provider', 'outcome'],
      registers,
    });
    this.agentRunSeconds = new Histogram({
      name: names.agentRunSeconds,
      help: help.agentRunSeconds,
      labelNames: ['agent', 'provider', 'outcome'],
      buckets: [...buckets.agent],
      registers,
    });
    this.pipelineCalls = new Histogram({
      name: names.pipelineCalls,
      help: help.pipelineCalls,
      labelNames: ['outcome'],
      buckets: [...buckets.agent],
      registers,
    });
    this.completions = new Counter({
      name: names.completions,
      help: help.completions,
      labelNames: ['status', 'source'],
      registers,
    });
    this.gateRejections = new Counter({
      name: names.gateRejections,
      help: help.gateRejections,
      labelNames: ['item', 'source', 'code'],
      registers,
    });
    this.transactions = new Histogram({
      name: names.transactions,
      help: help.transactions,
      buckets: [...buckets.write],
      registers,
    });
    this.jobs = new Histogram({
      name: names.jobs,
      help: help.jobs,
      labelNames: ['queue', 'outcome'],
      buckets: [...buckets.agent],
      registers,
    });
    this.retention = new Counter({
      name: names.retention,
      help: help.retention,
      labelNames: ['kind'],
      registers,
    });
  }

  pipelineCall(outcome: PipelineCallOutcome, seconds: number): void {
    this.pipelineCalls.observe({ outcome }, seconds);
  }

  /** Recorded only after the transaction that stored them commits. */
  committed(
    completions: readonly InsightCompletion[],
    runs: readonly AgentRun[],
    seconds: number,
  ): void {
    this.transactions.observe(seconds);
    for (const run of runs) {
      const labels = {
        agent: run.agent,
        provider: run.provider,
        outcome: run.outcome,
      };
      this.agentRuns.inc(labels);
      this.agentRunSeconds.observe(labels, run.latencyMs / 1_000);
    }
    for (const { status, gateReport } of completions) {
      this.completions.inc({ status, source: gateReport.source });
      for (const rejection of gateReport.rejected) {
        for (const code of rejection.codes) {
          this.gateRejections.inc({
            item: rejection.item,
            source: rejection.source,
            code,
          });
        }
      }
    }
  }

  job(queue: string, outcome: 'completed' | 'failed', seconds: number): void {
    this.jobs.observe({ queue, outcome }, seconds);
  }

  retained(counts: Readonly<Record<string, number>>): void {
    for (const [kind, count] of Object.entries(counts)) {
      if (count > 0) this.retention.inc({ kind }, count);
    }
  }
}
