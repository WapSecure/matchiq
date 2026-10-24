import type { MinutePhase } from '@matchiq/contracts';
import type { TimelineEntry } from '../types.js';
import { CONTEXT_WINDOWS, PERIOD_CLOCK, PHASE_MINUTES } from './constants.js';

export interface ClockPoint {
  readonly period: number;
  readonly clockMs: number;
}

const clockOf = (period: number) =>
  PERIOD_CLOCK[period] ?? { offsetMin: 0, lengthMin: 45 };

/**
 * Match time since kick-off. A moment from an earlier period is clamped to
 * that period's nominal end, so stoppage time never lands after a later period's start.
 */
export const matchMs = (point: ClockPoint, now?: ClockPoint): number => {
  const { offsetMin, lengthMin } = clockOf(point.period);
  const raw = offsetMin * CONTEXT_WINDOWS.minuteMs + point.clockMs;
  if (now === undefined || point.period >= now.period || lengthMin === 0) {
    return raw;
  }
  return Math.min(raw, (offsetMin + lengthMin) * CONTEXT_WINDOWS.minuteMs);
};

/** Scoreboard minute (1-based); stoppage time counts as the period's last minute. */
export const matchMinute = (point: ClockPoint): number => {
  const { offsetMin, lengthMin } = clockOf(point.period);
  const elapsed = Math.floor(point.clockMs / CONTEXT_WINDOWS.minuteMs);
  if (lengthMin > 0 && elapsed >= lengthMin) return offsetMin + lengthMin;
  return offsetMin + elapsed + 1;
};

export const minutePhase = (point: ClockPoint): MinutePhase => {
  const minute = matchMinute(point);
  if (point.period === 1) {
    if (minute <= PHASE_MINUTES.earlyMax) return 'EARLY';
    return minute >= PHASE_MINUTES.beforeHalfTimeMin
      ? 'BEFORE_HALF_TIME'
      : 'FIRST_HALF';
  }
  if (point.period > 2 || minute >= PHASE_MINUTES.finalMin) return 'FINAL_15';
  return 'SECOND_HALF';
};

/** Entries with match time in `(startMs, endMs]`, seen from `now`. */
export const countBetween = (
  entries: readonly TimelineEntry[],
  now: ClockPoint,
  startMs: number,
  endMs: number,
): number =>
  entries.filter((e) => {
    const at = matchMs(e, now);
    return at > startMs && at <= endMs;
  }).length;
