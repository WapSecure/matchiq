import type { MetricDefinition } from '@matchiq/contracts';
import { ALGORITHM_VERSION, WINDOW_SUFFIX, WINDOWS } from '../constants.js';
import { SIDES, type Side } from '../types.js';
import {
  MATCH_METRICS,
  MOMENTUM_METRIC,
  WINDOW_COUNT_METRICS,
  type BaseMetricDefinition,
} from './definitions.js';

export type WindowSuffix = (typeof WINDOW_SUFFIX)[keyof typeof WINDOW_SUFFIX];

export const matchRef = (base: string, side: Side): string => `${base}.${side}`;

export const windowRef = (
  base: string,
  side: Side,
  suffix: WindowSuffix = WINDOW_SUFFIX.current,
): string => `${base}.${side}.${suffix}`;

const expand = (
  definition: BaseMetricDefinition,
  side: Side,
  suffix?: WindowSuffix,
): MetricDefinition => ({
  metricRef:
    suffix === undefined
      ? matchRef(definition.base, side)
      : windowRef(definition.base, side, suffix),
  label: `${definition.label} (${side}${suffix === undefined ? '' : `, ${suffix}`})`,
  description: definition.description,
  formula: definition.formula,
  unit: definition.unit,
  ...(suffix === undefined ? {} : { windowMs: WINDOWS.rollingMs }),
  algorithmVersion: ALGORITHM_VERSION,
  heuristic: definition.heuristic,
});

const WINDOWED = [...WINDOW_COUNT_METRICS, MOMENTUM_METRIC];

/**
 * Every metricRef the engine can emit. `.rolling5m` is the 5-minute window
 * ending at the reference clock; `.previous5m` is the comparable window before it.
 */
export const METRIC_DEFINITIONS: readonly MetricDefinition[] = SIDES.flatMap(
  (side) => [
    ...MATCH_METRICS.map((d) => expand(d, side)),
    ...WINDOWED.map((d) => expand(d, side, WINDOW_SUFFIX.current)),
    ...WINDOWED.map((d) => expand(d, side, WINDOW_SUFFIX.previous)),
  ],
);

const BY_REF = new Map(METRIC_DEFINITIONS.map((d) => [d.metricRef, d]));

export const getMetricDefinition = (
  metricRef: string,
): MetricDefinition | undefined => BY_REF.get(metricRef);
