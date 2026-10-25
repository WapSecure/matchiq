import type { ContextMetric, TrendDirection } from '@matchiq/contracts';

export const COMPARISON_WINDOW_KEY = 'matchiq.comparison-window.v1';

export const COMPARISON_WINDOWS = ['5', '10', 'match'] as const;
export type ComparisonWindow = (typeof COMPARISON_WINDOWS)[number];
export const DEFAULT_COMPARISON_WINDOW: ComparisonWindow = '10';

export const METRIC_NOUNS: Record<ContextMetric, string> = {
  shots: 'shots',
  shotsOnTarget: 'shots on target',
  pressures: 'pressing moments',
  recoveries: 'ball wins',
  highRecoveries: 'ball wins high up the pitch',
  finalThirdEntries: 'entries into the attacking third',
};

export const TREND_WORDS: Record<TrendDirection, string> = {
  RISING: 'Building up',
  FALLING: 'Fading',
  STEADY: 'Holding steady',
  MIXED: 'Up and down',
};

export const COMPARISON_COPY = {
  title: 'Compared with',
  windowLegend: 'Compare over',
  windows: {
    '5': { label: 'Last 5 minutes', short: '5 min' },
    '10': { label: 'Last 10 minutes', short: '10 min' },
    match: { label: 'Whole match', short: 'Match' },
  },
  loading: 'Working out the comparison…',
  empty: 'Not enough match time yet to compare',
  windowEmpty: 'This view is not available for this moment yet',
  fiveMinuteScope:
    'Over 5 minutes only the team behind this moment is measured.',
  above: 'Above the match average',
  below: 'Below the match average',
  level: 'In line with the match average',
  recent: (count: number, noun: string, minutes: number) =>
    `${count} ${noun} in the last ${minutes} minutes`,
  average: (rate: string, minutes: number) =>
    `Match average ${rate} every ${minutes} minutes`,
  wholeMatch: (total: number, noun: string, rate: string) =>
    `About ${total} ${noun} so far, ${rate} every 10 minutes`,
  sample: (count: number, noun: string, total: number) =>
    `Based on ${count} ${noun} here and about ${total} so far in the match`,
  sampleMatch: (total: number) => `Based on about ${total} plays so far`,
  momentSample: (count: number) => `The moment itself rests on ${count} plays.`,
  trendTitle: 'Last three 5-minute spells',
  trendName: (noun: string, side: string, direction: string) =>
    `${side}: ${noun} in the last three 5-minute spells. ${direction}.`,
  spells: ['15 to 10 min ago', '10 to 5 min ago', 'Last 5 min'],
  spellsHeader: 'Spell',
  trendTable: 'View the trend as a table',
  tableCount: 'Count',
} as const;
