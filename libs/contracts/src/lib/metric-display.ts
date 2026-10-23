import { z } from 'zod';

/**
 * Metric families whose values are internal indices: descriptive scales the
 * engine computes, not numbers fans read. Fan and broadcast copy describes
 * them in words; analyst copy may show them with a plain-language label.
 * Every other family is a display number (counts, percentages, distances).
 */
export const InternalIndexMetric = z
  .enum(['momentum', 'xT', 'pressureIndex'])
  .meta({ id: 'InternalIndexMetric' });

/** Cross-language carrier so the agents service gets the same list by codegen. */
export const MetricDisplay = z.strictObject({
  internalIndex: InternalIndexMetric,
});

export const INTERNAL_INDEX_METRICS: ReadonlySet<string> = new Set(
  InternalIndexMetric.options,
);

/** True when a metric ref (`momentum.home.rolling5m`) names an internal index. */
export const isInternalIndexMetric = (metricRef: string): boolean =>
  INTERNAL_INDEX_METRICS.has(metricRef.split('.', 1)[0] ?? '');

export type InternalIndexMetric = z.infer<typeof InternalIndexMetric>;
export type MetricDisplay = z.infer<typeof MetricDisplay>;
