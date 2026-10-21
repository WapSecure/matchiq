export const EVIDENCE_COPY = {
  title: 'Evidence',
  close: 'Close evidence',
  sections: {
    claim: 'Claim',
    window: 'Evidence window',
    metrics: 'Computed metrics',
    events: 'Triggering events',
    counter: 'Counter-evidence',
    method: 'Method',
  },
  fields: {
    window: 'Window',
    confidence: 'Confidence',
    coverage: 'Data coverage',
    method: 'Method version',
    reason: 'Reason code',
    generated: 'Generated',
    status: 'Pipeline status',
  },
  metricsTable: { metric: 'Metric', value: 'Value' },
  noCounter: 'No counter-evidence recorded for this window.',
  noMetrics: 'No metrics were attached to this insight.',
  eventOutsideWindow: 'Outside the loaded timeline window',
  caveat:
    'Confidence is a heuristic label, not a guarantee. Figures come from the deterministic engine; agents only cite them.',
} as const;
