import type { Insight, Narrative } from '@matchiq/contracts';
import {
  CONTEXT_FIGURE_LABELS,
  FIGURE_DECIMAL_COMMA,
  FIGURE_NUMERAL_PATTERN,
  FIGURE_TOLERANCE,
  FIGURE_WORD_PATTERN,
  FIGURE_WORDS,
} from '@/constants/numbers-checked';
import { describeMetric } from '@/lib/metric-definition';

export type CheckedFigure = {
  /** The figure as written in the wording. */
  shown: string;
  /** Plain name of the stat it was matched to. */
  stat: string;
};

type Numeral = { shown: string; value: number; decimals: number };

const digits = (text: string): Numeral[] =>
  [...text.matchAll(FIGURE_NUMERAL_PATTERN)].map(([shown]) => {
    const normal = shown.replace(FIGURE_DECIMAL_COMMA, '.');
    return {
      shown,
      value: Number(normal),
      decimals: normal.split('.')[1]?.length ?? 0,
    };
  });

const spelled = (text: string, locale: string): Numeral[] => {
  const words = FIGURE_WORDS[locale] ?? {};
  return [...text.matchAll(FIGURE_WORD_PATTERN)].flatMap(([word]) => {
    const value = words[word.toLowerCase()];
    return value === undefined ? [] : [{ shown: word, value, decimals: 0 }];
  });
};

const represents = (numeral: Numeral, value: number): boolean => {
  const factor = 10 ** numeral.decimals;
  return (
    Math.abs(numeral.value - Math.round(Math.abs(value) * factor) / factor) <
    FIGURE_TOLERANCE
  );
};

/** Never a raw internal name: unknown refs get a neutral label. */
const statLabel = (ref: string): string => {
  const context = CONTEXT_FIGURE_LABELS[ref];
  if (context) return context;
  return describeMetric(ref).label;
};

/** The same stats the publish gate accepts: the moment's metrics and its context. */
const citable = (insight: Insight): [string, number][] =>
  Object.entries({
    ...insight.evidence.computedMetrics,
    ...(insight.context?.metrics ?? {}),
  });

/**
 * Re-checks every figure in the published wording against the moment's stats.
 * Returns null (so no claim is made) when there are no figures, the language is
 * not readable, or any figure matches no stat.
 */
export function checkFigures(
  insight: Insight,
  wording: { texts: readonly string[]; locale: string },
): CheckedFigure[] | null {
  if (!(wording.locale in FIGURE_WORDS)) return null;
  const stats = citable(insight);
  const found = wording.texts.flatMap((t) => [
    ...digits(t),
    ...spelled(t, wording.locale),
  ]);
  if (found.length === 0) return null;
  const matched: CheckedFigure[] = [];
  for (const numeral of found) {
    const hit = stats.find(([, v]) => represents(numeral, v));
    if (!hit) return null;
    const stat = statLabel(hit[0]);
    if (!matched.some((m) => m.shown === numeral.shown && m.stat === stat))
      matched.push({ shown: numeral.shown, stat });
  }
  return matched;
}

export const narrativeFigures = (
  insight: Insight,
  { headline, body, breakdown, locale }: Narrative,
): CheckedFigure[] | null =>
  checkFigures(insight, {
    locale,
    texts: [
      headline,
      body,
      ...(breakdown
        ? [
            breakdown.whatHappened.text,
            breakdown.whyItMatters.text,
            breakdown.whatToWatch.text,
          ]
        : []),
    ],
  });
