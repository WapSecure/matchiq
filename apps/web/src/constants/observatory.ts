import type {
  AgentName,
  AgentRunOutcome,
  ModelProvider,
} from '@matchiq/contracts';

export const OBSERVATORY_COPY = {
  metaTitle: 'Agent Observatory',
  eyebrow: 'Agent observatory',
  title: 'How every insight was published',
  description:
    'The deterministic engine detects each moment. Agents may propose wording; the worker publish gate re-checks every number, entity and citation, and anything rejected falls back to deterministic templates.',
  summary: {
    insights: 'Insights',
    agent: 'Agent-published',
    template: 'Template-published',
    pending: 'Pending',
    rejected: 'Gate rejections',
    providers: 'Providers used',
  },
  listLabel: 'Insight traces',
  empty: 'No insights detected yet. Traces appear as the replay runs.',
  error: 'Agent runs could not be loaded',
  loading: 'Loading agent runs',
  status: 'Pipeline status',
  publication: 'Published by',
  fallback: 'Fallback reason',
  gate: 'Publish gate',
  gatePending: 'Gate has not run yet.',
  published: (n: number) => `${n} published`,
  templates: (n: number) => `${n} from templates`,
  overlayRevision: (r: number | null) =>
    r === null ? 'Overlay copy unchanged' : `Overlay revision ${r}`,
  rejected: 'Rejected items',
  noRejections: 'Nothing rejected.',
  runs: 'Agent runs',
  noRuns: 'No agent runs recorded.',
  columns: {
    agent: 'Agent',
    provider: 'Provider',
    model: 'Model deployment',
    prompt: 'Prompt',
    latency: 'Latency',
    retries: 'Retries',
    outcome: 'Outcome',
  },
  notApplicable: '—',
  latency: (ms: number) => `${ms.toLocaleString('en-GB')} ms`,
  periodClock: 'Period clock',
  secretsNote:
    'Prompts and secrets are never exposed; only run metadata is shown.',
} as const;

export const PUBLICATION_LABELS = {
  AGENT: 'Agent',
  TEMPLATE: 'Template',
  PENDING: 'Pending',
} as const;

/** Honest provider names: a template or mock run is never presented as a model. */
export const PROVIDER_LABELS: Record<
  ModelProvider,
  { label: string; hint: string }
> = {
  template: {
    label: 'Template',
    hint: 'Deterministic templates; no model was called',
  },
  mock: {
    label: 'Mock',
    hint: 'Scripted test provider; not a language model',
  },
  ollama: { label: 'Ollama', hint: 'Local open-weights model via Ollama' },
  foundry: { label: 'Foundry', hint: 'Model deployment on Microsoft Foundry' },
};

export const AGENT_LABELS: Record<AgentName, string> = {
  MATCH_ANALYST: 'Match analyst',
  NARRATIVE_WRITER: 'Narrative writer',
  FACT_CHECKER: 'Fact checker',
  BROADCAST_PRODUCER: 'Broadcast producer',
  LOCALIZATION: 'Localization',
};

export const OUTCOME_LABELS: Record<AgentRunOutcome, string> = {
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  TIMED_OUT: 'Timed out',
  FALLBACK: 'Fallback',
};
