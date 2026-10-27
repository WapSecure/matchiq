import { QUEUE_WAIT_COPY, QUEUE_WAIT_MIN_MS } from '@/constants/moment-trace';

/** True when the moment sat in the queue long enough to colour its timings. */
export const hasQueueWait = (queueWaitMs: number | undefined): boolean =>
  queueWaitMs !== undefined && queueWaitMs >= QUEUE_WAIT_MIN_MS;

/** One quiet plain line, or null when the wait is unknown or ordinary. */
export const queueWaitLine = (
  queueWaitMs: number | undefined,
): string | null =>
  queueWaitMs !== undefined && hasQueueWait(queueWaitMs)
    ? QUEUE_WAIT_COPY.line(Math.round(queueWaitMs / 1_000))
    : null;
