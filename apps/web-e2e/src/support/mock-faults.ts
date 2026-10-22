import type { AgentRun } from '@matchiq/contracts';

const MINUTE = 60_000;

const run = (overrides: Partial<AgentRun>): AgentRun => ({
  runId: 'run_fault_1',
  correlationId: '5a1f3c2e-8b7d-4e6f-9a0b-1c2d3e4f5a6b',
  agent: 'NARRATIVE_WRITER',
  provider: 'mock',
  promptVersion: '1.0.0',
  startedAt: '2026-10-24T15:20:00Z',
  latencyMs: 12,
  retries: 0,
  outcome: 'SUCCEEDED',
  ...overrides,
});

const gate = (source: 'AGENT' | 'TEMPLATE') => ({
  source,
  publishedNarratives: 12,
  templateNarratives: source === 'AGENT' ? 0 : 12,
  overlayRevision: null,
  rejected: [],
});

/** Traces as the agents service labels a WRITER_REVISE and a MODEL_TIMEOUT run. */
export const mockFaultTraces = () => [
  {
    insightId: 'in_fault_revise',
    kind: 'SHOT_BURST',
    matchClockMs: 31 * MINUTE,
    status: 'PUBLISHED',
    publication: 'AGENT',
    fallbackReason: null,
    gate: gate('AGENT'),
    runs: [
      run({ agent: 'MATCH_ANALYST', startedAt: '2026-10-24T15:20:00Z' }),
      run({
        startedAt: '2026-10-24T15:20:01Z',
        faultNote:
          'Simulated failure (demo): the casual draft was altered to cite fault.injected = 99, a value the engine never computed',
      }),
      run({
        agent: 'FACT_CHECKER',
        provider: 'template',
        startedAt: '2026-10-24T15:20:02Z',
        faultNote:
          'Fact Checker returned REVISE: CASUAL: cited metric fault.injected is not in the evidence',
      }),
      run({
        startedAt: '2026-10-24T15:20:03Z',
        faultNote: 'Constrained revision of the rejected persona only',
      }),
    ].map((r) => ({ ...r, faultInjected: 'WRITER_REVISE' as const })),
  },
  {
    insightId: 'in_fault_timeout',
    kind: 'PRESSURE_SWING',
    matchClockMs: 38 * MINUTE,
    status: 'FALLBACK',
    publication: 'TEMPLATE',
    fallbackReason:
      'analyst: model output unavailable or ungrounded; writer: model output unavailable; circuit breaker opened after simulated timeouts',
    gate: gate('TEMPLATE'),
    runs: [
      run({
        agent: 'MATCH_ANALYST',
        outcome: 'TIMED_OUT',
        retries: 2,
        startedAt: '2026-10-24T15:25:00Z',
        faultNote:
          'Simulated failure (demo): every model call raised a timeout',
      }),
      run({
        agent: 'MATCH_ANALYST',
        provider: 'template',
        outcome: 'FALLBACK',
        startedAt: '2026-10-24T15:25:01Z',
      }),
      run({
        outcome: 'FAILED',
        latencyMs: 0,
        startedAt: '2026-10-24T15:25:02Z',
        faultNote:
          'Circuit breaker open: call refused without reaching the model',
      }),
    ].map((r) => ({ ...r, faultInjected: 'MODEL_TIMEOUT' as const })),
  },
];
