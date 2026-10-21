import { STREAM_TIMING } from '@/constants/api';

export type BackoffPolicy = {
  baseMs: number;
  maxMs: number;
  jitterRatio: number;
};

export const DEFAULT_BACKOFF: BackoffPolicy = {
  baseMs: STREAM_TIMING.backoffBaseMs,
  maxMs: STREAM_TIMING.backoffMaxMs,
  jitterRatio: STREAM_TIMING.backoffJitterRatio,
};

const GROWTH = 2;

/**
 * Capped exponential backoff with symmetric jitter. `attempt` is 0-based;
 * `random` returns [0, 1) and is injected so tests are deterministic.
 */
export const backoffDelay = (
  attempt: number,
  policy: BackoffPolicy = DEFAULT_BACKOFF,
  random: () => number = Math.random,
): number => {
  const exponential = Math.min(
    policy.maxMs,
    policy.baseMs * GROWTH ** Math.max(0, attempt),
  );
  const jitter = exponential * policy.jitterRatio * (random() * 2 - 1);
  return Math.round(Math.max(0, Math.min(policy.maxMs, exponential + jitter)));
};
