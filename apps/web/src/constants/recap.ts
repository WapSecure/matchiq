export const RECAP_COPY = {
  metaTitle: 'Match recap',
  eyebrow: 'Full-time recap',
  fullTime: 'Full time',
  scoreLabel: (home: string, away: string, h: number, a: number) =>
    `${home} ${h}, ${away} ${a}`,
  momentsTitle: 'Key moments',
  momentsDescription: 'Every key moment of the match, with the plays behind it',
  momentsEmpty: 'No key moments were spotted in this match.',
  metricsTitle: 'Final stats',
  evidence: (n: number) => `${n} play${n === 1 ? '' : 's'} behind it`,
  metricRefs: (n: number) => `${n} stat${n === 1 ? '' : 's'} used`,
  noNarrative: 'No write-up for this audience. Here are the facts.',
  localeFallback: (language: string) =>
    `Not yet available in ${language}, so this is in English.`,
  export: 'Download recap (JSON)',
  exportHint: 'Saves the full recap as a data file for your own tools',
  exportFile: (fixtureId: string) => `matchiq-recap-${fixtureId}.json`,
  notReady: {
    title: 'The recap is ready at full time',
    description:
      'We put it together from the final stats and key moments when the match ends. This page updates by itself.',
    back: 'Back to the live studio',
  },
  error: "We couldn't load the recap",
  loading: 'Loading the recap',
  technical: {
    events: 'Event ids',
    reason: 'Reason code',
  },
} as const;

export const JSON_MEDIA_TYPE = 'application/json';
export const JSON_INDENT = 2;
