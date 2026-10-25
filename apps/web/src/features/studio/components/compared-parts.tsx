import { SpellTrend } from '@/components/charts/spell-trend';
import {
  COMPARISON_COPY,
  METRIC_NOUNS,
  TREND_WORDS,
  type ComparisonWindow,
} from '@/constants/comparison';
import {
  verdictOf,
  type Comparison,
  type SideFigure,
} from '../lib/comparison-model';

const minutesOf = (chosen: ComparisonWindow) => (chosen === '5' ? 5 : 10);

export function FigureRow({
  figure,
  name,
  noun,
  chosen,
}: {
  figure: SideFigure;
  name: string;
  noun: string;
  chosen: ComparisonWindow;
}) {
  const rate = figure.rate.toFixed(1);
  if (chosen === 'match') {
    return (
      <li className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-ink">{name}</span>
        <span className="text-[13px] text-ink-muted">
          {COMPARISON_COPY.wholeMatch(figure.count, noun, rate)}
        </span>
        <span className="text-xs text-ink-subtle">
          {COMPARISON_COPY.sampleMatch(figure.matchTotal)}
        </span>
      </li>
    );
  }
  const minutes = minutesOf(chosen);
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-[13px] font-semibold text-ink">
        {name}: {COMPARISON_COPY[verdictOf(figure.count, figure.rate)]}
      </span>
      <span className="tabular text-[13px] text-ink-muted">
        {COMPARISON_COPY.recent(figure.count, noun, minutes)}.{' '}
        {COMPARISON_COPY.average(rate, minutes)}.
      </span>
      <span className="text-xs text-ink-subtle">
        {COMPARISON_COPY.sample(figure.count, noun, figure.matchTotal)}
      </span>
    </li>
  );
}

export function Trend({
  comparison,
  name,
}: {
  comparison: Comparison;
  name: string;
}) {
  if (!comparison.spells) return null;
  const words = comparison.direction ? TREND_WORDS[comparison.direction] : '';
  const noun = METRIC_NOUNS[comparison.metric];
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-micro font-semibold uppercase tracking-wide text-ink-subtle">
        {COMPARISON_COPY.trendTitle}
      </h4>
      <SpellTrend
        side={comparison.subject}
        spells={comparison.spells}
        label={COMPARISON_COPY.trendName(noun, name, words)}
      />
    </div>
  );
}
