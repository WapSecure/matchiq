const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export const RECAP_COPY = {
  metaTitle: 'Match recap',
  eyebrow: 'Full time',
  fullTime: 'Full time',
  scoreLabel: (home: string, away: string, h: number, a: number) =>
    `${home} ${h}, ${away} ${a}`,
  result: (home: string, away: string, h: number, a: number) =>
    h === a
      ? `${home} and ${away} draw ${h}–${a}`
      : h > a
        ? `${home} beat ${away} ${h}–${a}`
        : `${away} win ${a}–${h} away at ${home}`,
  storyLabel: 'The story of the match',
  facts: {
    moments: (n: number) => plural(n, 'key moment'),
    possession: (home: string, away: string) => `Possession ${home}–${away}`,
    shots: (home: number, away: number) => `Shots ${home}–${away}`,
  },
  momentsTitle: 'Key moments',
  momentsDescription: 'Every key moment of the match, with the plays behind it',
  momentsEmpty: 'No key moments were spotted in this match.',
  stripLabel: 'Match timeline by minute',
  marker: (minute: string, headline: string) => `${minute}: ${headline}`,
  metricsTitle: 'Final stats',
  evidence: (n: number) => `${n} play${n === 1 ? '' : 's'} behind it`,
  metricRefs: (n: number) => `${n} stat${n === 1 ? '' : 's'} used`,
  noNarrative: 'No write-up for this audience. Here are the facts.',
  localeFallback: (language: string) =>
    `The ${language} version isn't ready yet, so you're seeing English.`,
  export: {
    trigger: 'Download match report',
    menuLabel: 'Choose a format',
    report: {
      label: 'Match report',
      description: 'A readable summary to share or print (.txt)',
    },
    data: {
      label: 'Data file',
      description: 'The full recap for your own tools (.json)',
    },
    reportFile: (name: string) => `matchiq-report-${name}.txt`,
    dataFile: (name: string) => `matchiq-recap-${name}.json`,
  },
  report: {
    heading: (title: string) => `${title} — match report`,
    score: (home: string, away: string, h: number, a: number) =>
      `Final score: ${home} ${h}–${a} ${away}`,
    moments: 'Key moments',
    stats: 'Final stats',
    statLine: (label: string, home: string, away: string) =>
      `${label}: ${home}–${away}`,
    unavailable: 'not available',
    footer:
      'Simulated match. Every number comes from the match data, never from AI.',
  },
  notReady: {
    title: 'The recap is ready at full time',
    description:
      'We put it together from the final stats and key moments when the match ends. This page updates by itself.',
    waiting: 'Waiting for the final whistle',
    expectTitle: "What you'll get",
    expect: [
      'The final score and the story of the match',
      'Every key moment on a timeline, with the plays behind it',
      'Final stats and a match report to download',
    ],
    back: 'Back to the live studio',
  },
  error: "We couldn't load the recap",
  loading: 'Loading the recap',
  technical: {
    events: 'Event ids',
    metrics: 'Metric refs',
    reason: 'Reason code',
  },
} as const;

export const JSON_MEDIA_TYPE = 'application/json';
export const TEXT_MEDIA_TYPE = 'text/plain;charset=utf-8';
export const JSON_INDENT = 2;
export const REPORT_RULE = '—'.repeat(24);
