export const EVIDENCE_COPY = {
  title: 'Evidence',
  close: 'Close evidence',
  sections: {
    claim: 'What we said',
    window: 'When',
    metrics: 'Stats used',
    events: 'The plays behind it',
    counter: 'What points the other way',
  },
  fields: {
    window: 'Time span',
    confidence: 'Strength of evidence',
    coverage: 'Data completeness',
  },
  metricsTable: { metric: 'Stat', value: 'Value' },
  noCounter: 'Nothing in this spell points the other way.',
  noMetrics: 'No stats were needed for this moment.',
  eventOutsideWindow: 'Details for this play are not available',
  resolving: 'Looking up this play…',
  caveat:
    'Strength of evidence is a guide, not a guarantee. Every number comes from the match data.',
  technical: {
    insightId: 'Insight id',
    method: 'Method version',
    reason: 'Reason code',
    status: 'Where this moment is',
    generated: 'Generated',
    events: 'Event ids',
    metrics: 'Metric refs and formulas',
  },
} as const;
