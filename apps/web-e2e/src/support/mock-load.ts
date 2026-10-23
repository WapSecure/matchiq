const MINUTE = 60_000;

const REASONS = [
  'agents service unreachable: connect ECONNREFUSED',
  'agents service timed out after 4000 ms',
  'agents service returned HTTP 503',
] as const;

const KINDS = ['SHOT_BURST', 'PRESSURE_SWING', 'MOMENTUM_SHIFT'] as const;

/** Moments that fell back to standard wording while the AI service was overloaded. */
export const mockLoadTraces = (count = 8) =>
  Array.from({ length: count }, (_, i) => ({
    insightId: `in_load_${i}`,
    kind: KINDS[i % KINDS.length],
    matchClockMs: (40 + i * 6) * MINUTE,
    status: 'FALLBACK',
    publication: 'TEMPLATE',
    fallbackReason: REASONS[i % REASONS.length],
    gate: {
      source: 'TEMPLATE',
      publishedNarratives: 12,
      templateNarratives: 12,
      overlayRevision: null,
      rejected: [],
    },
    runs: [
      {
        runId: `run_load_${i}`,
        correlationId: '7c1e2a3b-4d5e-4f60-8a9b-0c1d2e3f4a5b',
        agent: 'NARRATIVE_WRITER',
        provider: 'template',
        promptVersion: '1.0.0',
        startedAt: `2026-10-24T15:${String(30 + i).padStart(2, '0')}:00Z`,
        latencyMs: 0,
        retries: 0,
        outcome: 'FALLBACK',
      },
    ],
  }));
