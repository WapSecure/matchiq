'use client';

import type { ContextSide, Insight, Persona } from '@matchiq/contracts';
import { useEffect } from 'react';
import { SegmentedControl, Skeleton } from '@/components/ui';
import {
  COMPARISON_COPY,
  COMPARISON_WINDOWS,
  METRIC_NOUNS,
} from '@/constants/comparison';
import { SIDE_LABELS } from '@/constants/match';
import { buildComparison, figuresFor } from '../lib/comparison-model';
import { FigureRow, Trend } from './compared-parts';
import { useComparisonWindow } from '../lib/comparison-window';

type ComparedWithProps = {
  insight: Insight;
  persona: Persona;
  /** Team names by side; falls back to Home and Away. */
  names?: Partial<Record<ContextSide, string>>;
  loading?: boolean;
};

const OPTIONS = COMPARISON_WINDOWS.map((value) => ({
  value,
  label: COMPARISON_COPY.windows[value].label,
  short: COMPARISON_COPY.windows[value].short,
}));

/** Analyst only: the moment's key count against the match average, with sample sizes. */
export function ComparedWith({
  insight,
  persona,
  names,
  loading = false,
}: ComparedWithProps) {
  const chosen = useComparisonWindow((s) => s.chosen);
  const choose = useComparisonWindow((s) => s.choose);
  const hydrate = useComparisonWindow((s) => s.hydrate);
  useEffect(hydrate, [hydrate]);
  if (persona !== 'ANALYST') return null;
  if (loading) return <Skeleton className="h-24 w-full" />;
  const comparison = buildComparison(insight);
  if (!comparison) {
    return <p className="text-sm text-ink-muted">{COMPARISON_COPY.empty}</p>;
  }
  const nameOf = (side: ContextSide) => names?.[side] ?? SIDE_LABELS[side];
  const figures = figuresFor(comparison, chosen);
  const noun = METRIC_NOUNS[comparison.metric];
  const { limitations, sampleSize } = insight.evidence;
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        legend={COMPARISON_COPY.windowLegend}
        options={OPTIONS}
        value={chosen}
        onChange={choose}
        className="max-w-full"
      />
      {figures.length === 0 ? (
        <p className="text-sm text-ink-muted">{COMPARISON_COPY.windowEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {figures.map((f) => (
            <FigureRow
              key={f.side}
              figure={f}
              name={nameOf(f.side)}
              noun={noun}
              chosen={chosen}
            />
          ))}
        </ul>
      )}
      {chosen === '5' && figures.length > 0 ? (
        <p className="text-xs text-ink-subtle">
          {COMPARISON_COPY.fiveMinuteScope}
        </p>
      ) : null}
      <Trend comparison={comparison} name={nameOf(comparison.subject)} />
      {sampleSize !== undefined ? (
        <p className="text-xs text-ink-subtle">
          {COMPARISON_COPY.momentSample(sampleSize)}
        </p>
      ) : null}
      {limitations ? (
        <p className="text-xs text-ink-subtle">{limitations}</p>
      ) : null}
    </div>
  );
}
