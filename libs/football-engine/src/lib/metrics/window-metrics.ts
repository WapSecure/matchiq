import { WINDOW_SUFFIX } from '../constants.js';
import {
  SIDES,
  TRACKED_KINDS,
  type ProjectionState,
  type Side,
  type TeamTimeline,
} from '../types.js';
import { momentumFor } from './momentum.js';
import { windowRef, type WindowSuffix } from './registry.js';
import {
  entriesIn,
  previousWindow,
  rollingWindow,
  type ClockWindow,
} from './windows.js';

export type MetricRecord = Record<string, number>;

/** Counts for every tracked kind plus momentum (when available) for both sides. */
export const windowMetrics = (
  timelines: Readonly<Record<Side, TeamTimeline>>,
  window: ClockWindow,
  suffix: WindowSuffix = WINDOW_SUFFIX.current,
): MetricRecord => {
  const record: MetricRecord = {};
  for (const side of SIDES) {
    for (const kind of TRACKED_KINDS) {
      record[windowRef(kind, side, suffix)] = entriesIn(
        timelines[side][kind],
        window,
      ).length;
    }
    const momentum = momentumFor(timelines, side, window).value;
    if (momentum.status === 'available') {
      record[windowRef('momentum', side, suffix)] = momentum.value;
    }
  }
  return record;
};

/** The current clock's window for a projection, or null before any event. */
export const currentWindow = (state: ProjectionState): ClockWindow | null => {
  const { period, clockMs, periodStartClockMs } = state.derived;
  return period === null
    ? null
    : rollingWindow(period, clockMs, periodStartClockMs);
};

/**
 * `.rolling5m` metrics at the projection's current clock, plus `.previous5m`
 * once a full comparable window exists in the current period.
 */
export const rollingMetrics = (state: ProjectionState): MetricRecord => {
  const window = currentWindow(state);
  if (window === null) return {};
  const previous = previousWindow(window);
  const timelines = state.derived.timelines;
  return {
    ...windowMetrics(timelines, window),
    ...(previous === null
      ? {}
      : windowMetrics(timelines, previous, WINDOW_SUFFIX.previous)),
  };
};
