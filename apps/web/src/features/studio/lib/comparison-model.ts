import {
  CONTEXT_REFS,
  type ContextMetric,
  type ContextSide,
  type Insight,
  type TrendDirection,
} from '@matchiq/contracts';
import type { ComparisonWindow } from '@/constants/comparison';

export type SideFigure = {
  side: ContextSide;
  /** Count in the window, or the match total so far for the whole match. */
  count: number;
  /** Match rate over the window length, rounded to one decimal. */
  rate: number;
  /** Plays counted in the match so far, estimated from the rate. */
  matchTotal: number;
};

export type Comparison = {
  metric: ContextMetric;
  subject: ContextSide;
  figures: SideFigure[];
  /** Spell counts, oldest first, for the subject team only. */
  spells: number[] | null;
  direction: TrendDirection | null;
};

const TEN = 10;
const HALF = 0.5;
const DECIMALS = 10;
const round1 = (n: number) => Math.round(n * DECIMALS) / DECIMALS;

const SIDES: ContextSide[] = ['home', 'away'];

/** Reads engine numbers only; a figure that is not in the payload is left out. */
export const buildComparison = (insight: Insight): Comparison | null => {
  const ctx = insight.context;
  if (!ctx?.comparison) return null;
  const m = ctx.metrics;
  const minute = m[CONTEXT_REFS.minute];
  if (minute === undefined) return null;
  const figures: SideFigure[] = [];
  for (const side of SIDES) {
    const count = m[CONTEXT_REFS.recent(side)];
    const rate = m[CONTEXT_REFS.average(side)];
    if (count === undefined || rate === undefined) return null;
    figures.push({
      side,
      count,
      rate,
      matchTotal: Math.round((rate * minute) / TEN),
    });
  }
  const spells = CONTEXT_REFS.spells.map((ref) => m[ref]);
  const complete = spells.every((s) => s !== undefined);
  return {
    metric: ctx.comparison.metric,
    subject: ctx.side,
    figures,
    spells: complete ? (spells as number[]) : null,
    direction: ctx.trend?.direction ?? null,
  };
};

/** The figures a window supports; the 5-minute view covers the moment's team only. */
export const figuresFor = (
  comparison: Comparison,
  chosen: ComparisonWindow,
): SideFigure[] => {
  if (chosen === '10') return comparison.figures;
  if (chosen === 'match') {
    return comparison.figures.map((f) => ({ ...f, count: f.matchTotal }));
  }
  const last = comparison.spells?.[comparison.spells.length - 1];
  if (last === undefined) return [];
  return comparison.figures
    .filter((f) => f.side === comparison.subject)
    .map((f) => ({ ...f, count: last, rate: round1(f.rate * HALF) }));
};

export const verdictOf = (
  count: number,
  rate: number,
): 'above' | 'below' | 'level' =>
  count > rate ? 'above' : count < rate ? 'below' : 'level';
