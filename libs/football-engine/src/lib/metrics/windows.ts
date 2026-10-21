import { WINDOWS } from '../constants.js';
import type { TimelineEntry } from '../types.js';

/**
 * A match-clock window inside one period: events with
 * `endMs - lengthMs < clockMs <= endMs`, clipped to the period start.
 * Windows never span periods because `matchClockMs` is per period.
 */
export interface ClockWindow {
  readonly period: number;
  readonly endMs: number;
  readonly periodStartMs: number;
  readonly lengthMs: number;
}

export const rollingWindow = (
  period: number,
  endMs: number,
  periodStartMs: number,
): ClockWindow => ({
  period,
  endMs,
  periodStartMs,
  lengthMs: WINDOWS.rollingMs,
});

/** The comparable window immediately before `window`, or null if it would precede the period. */
export const previousWindow = (window: ClockWindow): ClockWindow | null => {
  const endMs = window.endMs - window.lengthMs;
  if (endMs - window.lengthMs < window.periodStartMs) return null;
  return { ...window, endMs };
};

export const windowStartMs = (window: ClockWindow): number =>
  Math.max(window.periodStartMs, window.endMs - window.lengthMs);

/** Elapsed match time the window actually covers (shorter early in a period). */
export const effectiveLengthMs = (window: ClockWindow): number =>
  window.endMs - windowStartMs(window);

export const inWindow = (
  window: ClockWindow,
  period: number,
  clockMs: number,
): boolean =>
  period === window.period &&
  clockMs <= window.endMs &&
  clockMs > window.endMs - window.lengthMs;

export const entriesIn = (
  entries: readonly TimelineEntry[],
  window: ClockWindow,
): TimelineEntry[] =>
  entries.filter((e) => inWindow(window, e.period, e.clockMs));
