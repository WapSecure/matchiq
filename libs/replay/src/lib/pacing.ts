import type { MatchEvent, ReplaySpeed } from '@matchiq/contracts';
import type { ReplayTiming } from './types.js';

/** Match-clock gap between consecutive events, with dead time and period breaks compressed. */
export const compressedGapMs = (
  previous: MatchEvent | undefined,
  next: MatchEvent,
  timing: ReplayTiming,
): number => {
  if (previous === undefined) return 0;
  const gap =
    previous.period === next.period
      ? Math.max(0, next.matchClockMs - previous.matchClockMs)
      : timing.periodBreakMs;
  return Math.min(gap, timing.maxGapMs);
};

export const realDelayMs = (
  previous: MatchEvent | undefined,
  next: MatchEvent,
  options: { timing: ReplayTiming; speed: ReplaySpeed },
): number => compressedGapMs(previous, next, options.timing) / options.speed;
