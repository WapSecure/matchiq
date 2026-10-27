import type { Locale } from '@matchiq/contracts';
import {
  HEADLINE_MAX,
  MILESTONE_FACT_KEY,
  MILESTONE_METRICS,
  MILESTONE_PHRASES,
  type MilestoneMetric,
} from './milestone-constants';
import type { TemplateFacts } from './template-facts';

type Side = 'home' | 'away';

/** The first known milestone metric the insight carries for its side, if any. */
export const milestoneRef = (
  metrics: Readonly<Record<string, number>>,
  side: Side,
): { metric: MilestoneMetric; metricRef: string } | undefined => {
  for (const metric of MILESTONE_METRICS) {
    const metricRef = `${metric}.${side}`;
    if (metrics[metricRef] !== undefined) return { metric, metricRef };
  }
  return undefined;
};

const amountOf = (locale: Locale, f: TemplateFacts): string | undefined => {
  const count = f.v[MILESTONE_FACT_KEY];
  if (f.milestone === undefined || count === undefined) return undefined;
  const noun = MILESTONE_PHRASES[locale].nouns[f.milestone];
  return `${count} ${count === '1' ? noun.one : noun.other}`;
};

type Part = 'headline' | 'body' | 'casual';

/** Specific milestone wording, or the locale's generic line when the metric is unknown. */
export const milestoneLine = (
  locale: Locale,
  part: Part,
  f: TemplateFacts,
  generic: string,
): string => {
  const amount = amountOf(locale, f);
  if (amount === undefined) return generic;
  const phrases = MILESTONE_PHRASES[locale];
  if (part === 'body') return phrases.body(amount);
  if (part === 'casual') return phrases.casual(f.team, amount);
  const headline = phrases.headline(f.team, amount);
  return headline.length > HEADLINE_MAX ? amount : headline;
};
