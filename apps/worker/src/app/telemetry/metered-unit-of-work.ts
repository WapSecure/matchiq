import type { AgentRun } from '@matchiq/contracts';
import type {
  InsightCompletion,
  PipelineTransaction,
  PipelineUnitOfWork,
} from '@matchiq/db';
import type { WorkerMetrics } from './worker-metrics';

/**
 * Observes what each pipeline transaction stores (completions with their gate
 * reports, agent runs) and reports it only once the transaction commits, so a
 * rolled-back or skipped batch never counts.
 */
export const meteredUnitOfWork = (
  inner: PipelineUnitOfWork,
  metrics: WorkerMetrics,
): PipelineUnitOfWork => ({
  transaction: async (work) => {
    const completions: InsightCompletion[] = [];
    const runs: AgentRun[] = [];
    const started = performance.now();
    const result = await inner.transaction((tx) => {
      const observed: PipelineTransaction = Object.create(tx, {
        completeInsight: {
          value: (...args: Parameters<PipelineTransaction['completeInsight']>) => {
            completions.push(args[2]);
            return tx.completeInsight(...args);
          },
        },
        insertAgentRuns: {
          value: (...args: Parameters<PipelineTransaction['insertAgentRuns']>) => {
            runs.push(...args[2]);
            return tx.insertAgentRuns(...args);
          },
        },
      }) as PipelineTransaction;
      return work(observed);
    });
    metrics.committed(completions, runs, (performance.now() - started) / 1_000);
    return result;
  },
});
