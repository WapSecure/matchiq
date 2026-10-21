import {
  METRIC_BASES,
  METRIC_REF_SEPARATOR,
  METRIC_SIDES,
  METRIC_WINDOWS,
} from '@/constants/metrics';

export type MetricDescription = {
  label: string;
  formula: string | null;
};

const describeScope = (side?: string, window?: string): string =>
  [side && METRIC_SIDES[side], window && METRIC_WINDOWS[window]]
    .filter(Boolean)
    .join(', ');

/** `pressures.away.rolling5m` → "Pressures (away, latest 5 min)" plus its formula. */
export const describeMetric = (metricRef: string): MetricDescription => {
  const [base = '', side, window] = metricRef.split(METRIC_REF_SEPARATOR);
  const known = METRIC_BASES[base];
  if (!known) return { label: metricRef, formula: null };
  const scope = describeScope(side, window);
  return {
    label: scope ? `${known.label} (${scope})` : known.label,
    formula: known.formula,
  };
};
