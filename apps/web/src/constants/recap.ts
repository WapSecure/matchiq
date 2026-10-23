export const RECAP_COPY = {
  metaTitle: 'Match Recap',
  eyebrow: 'Full-time recap',
  fullTime: 'Full time',
  scoreLabel: (home: string, away: string, h: number, a: number) =>
    `${home} ${h}, ${away} ${a}`,
  momentsTitle: 'Key moments',
  momentsDescription:
    'Every moment the engine detected, with the events that triggered it',
  momentsEmpty: 'No key moments were detected in this match.',
  metricsTitle: 'Final metrics',
  evidence: (n: number) => `${n} triggering event${n === 1 ? '' : 's'}`,
  metricRefs: (n: number) => `${n} metric${n === 1 ? '' : 's'} cited`,
  noNarrative: 'No narrative for this audience; facts only.',
  localeFallback: (locale: string) =>
    `${locale} variant unavailable; showing en-GB.`,
  export: 'Export JSON',
  exportHint:
    'Download match statistics, key moments and source references as JSON',
  exportFile: (name: string) => `matchiq-recap-${name}.json`,
  notReady: {
    title: 'Recap available at full time',
    description:
      'The recap appears when the match ends. This page refreshes automatically.',
    back: 'Back to the live studio',
  },
  error: "We couldn't load the recap",
  loading: 'Loading recap',
  engine: (version: string) => `Engine v${version}`,
} as const;

export const JSON_MEDIA_TYPE = 'application/json';
export const JSON_INDENT = 2;
