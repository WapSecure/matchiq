import {
  METRIC_BASES,
  METRIC_REF_SEPARATOR,
  METRIC_SIDES,
  METRIC_WINDOWS,
} from '@/constants/metrics';

export type MetricDescription = {
  label: string;
  /** The on-screen definition; null for refs the registry does not know. */
  plain: string | null;
  /** The engine formula, for Technical details. */
  formula: string | null;
};

const describeScope = (side?: string, window?: string): string =>
  [side && METRIC_SIDES[side], window && METRIC_WINDOWS[window]]
    .filter(Boolean)
    .join(', ');

/** `pressures.away.rolling5m` → "Pressures (away, last 5 min)" with its definition. */
export const describeMetric = (metricRef: string): MetricDescription => {
  const [base = '', side, window] = metricRef.split(METRIC_REF_SEPARATOR);
  const known = METRIC_BASES[base];
  if (!known) return { label: metricRef, plain: null, formula: null };
  const scope = describeScope(side, window);
  return {
    label: scope ? `${known.label} (${scope})` : known.label,
    plain: known.plain,
    formula: known.formula,
  };
};
