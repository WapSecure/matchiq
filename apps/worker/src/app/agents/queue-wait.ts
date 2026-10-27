import type { Publication } from '../pipeline/publication';

/** Milliseconds from enqueue to the first attempt starting; null for retries or unknown timing. */
export const firstAttemptWaitMs = (job: {
  readonly timestamp: number;
  readonly processedOn?: number;
  readonly attemptsMade: number;
}): number | null =>
  job.attemptsMade > 0 || job.processedOn === undefined
    ? null
    : Math.max(0, Math.round(job.processedOn - job.timestamp));

/** Records the wait on the stored gate report so the trace can show it. */
export const withQueueWait = (
  publication: Publication,
  queueWaitMs: number | undefined,
): Publication =>
  queueWaitMs === undefined
    ? publication
    : {
        ...publication,
        completion: {
          ...publication.completion,
          gateReport: { ...publication.completion.gateReport, queueWaitMs },
        },
      };
