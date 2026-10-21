import type { MetricValue } from '@matchiq/contracts';
import {
  MOMENTUM_MIN_EVENTS,
  MOMENTUM_REFERENCE,
  MOMENTUM_WEIGHTS,
  MOMENTUM_Z_BOUND,
  ROUNDING,
  WINDOWS,
} from '../constants.js';
import { opponentOf } from '../projection/initial-state.js';
import type { Side, TeamTimeline } from '../types.js';
import { clamp, roundTo } from '../util/numbers.js';
import { effectiveLengthMs, entriesIn, type ClockWindow } from './windows.js';

export type MomentumComponent = keyof typeof MOMENTUM_WEIGHTS;
const COMPONENTS = Object.keys(MOMENTUM_WEIGHTS) as MomentumComponent[];

export type ComponentCounts = Readonly<Record<MomentumComponent, number>>;

export interface MomentumResult {
  readonly value: MetricValue;
  readonly counts: ComponentCounts;
}

export const componentCounts = (
  timeline: TeamTimeline,
  window: ClockWindow,
): ComponentCounts => ({
  shots: entriesIn(timeline.shots, window).length,
  finalThirdEntries: entriesIn(timeline.finalThirdEntries, window).length,
  pressures: entriesIn(timeline.pressures, window).length,
  highRecoveries: entriesIn(timeline.highRecoveries, window).length,
});

const total = (counts: ComponentCounts): number =>
  COMPONENTS.reduce((sum, key) => sum + counts[key], 0);

/**
 * Spec §9 momentum index for one team over a 5-minute window:
 *
 *   rate_k = count_k * (5 min / covered window length)
 *   z_k    = clamp((rate_k - mean_k) / sd_k, -3, 3)   (MOMENTUM_REFERENCE)
 *   M      = 0.35 z_shots + 0.25 z_finalThirdEntries + 0.20 z_pressures + 0.20 z_highRecoveries
 *
 * M lies in [-3, 3]; 0 means reference activity. A descriptive heuristic,
 * never a win probability. Unavailable (INSUFFICIENT_SAMPLE) while the window
 * covers under 2 minutes or both teams together have fewer than 3 contributing events.
 */
export const momentumFor = (
  timelines: Readonly<Record<Side, TeamTimeline>>,
  side: Side,
  window: ClockWindow,
): MomentumResult => {
  const counts = componentCounts(timelines[side], window);
  const covered = effectiveLengthMs(window);
  const combined =
    total(counts) + total(componentCounts(timelines[opponentOf(side)], window));
  if (
    covered < WINDOWS.momentumMinElapsedMs ||
    combined < MOMENTUM_MIN_EVENTS
  ) {
    return {
      value: { status: 'unavailable', reason: 'INSUFFICIENT_SAMPLE' },
      counts,
    };
  }
  const scale = window.lengthMs / covered;
  const score = COMPONENTS.reduce((sum, key) => {
    const { mean, sd } = MOMENTUM_REFERENCE[key];
    const z = clamp(
      (counts[key] * scale - mean) / sd,
      -MOMENTUM_Z_BOUND,
      MOMENTUM_Z_BOUND,
    );
    return sum + MOMENTUM_WEIGHTS[key] * z;
  }, 0);
  return {
    value: {
      status: 'available',
      value: roundTo(score, ROUNDING.indexDecimals),
      unit: 'index',
    },
    counts,
  };
};
