import type {
  AgentName,
  AgentRunOutcome,
  ModelProvider,
} from '@matchiq/contracts';
import type { FallbackGroup } from './fact-checks';
import { THROUGHPUT_REASON_COPY } from './throughput-reasons';

export const OBSERVATORY_COPY = {
  metaTitle: 'Fact-checks',
  eyebrow: 'Fact-checks',
  title: 'How each key moment was written and checked',
  description:
    'Key moments are spotted in the match data. AI writes them up, and a fact check compares every number, name and claim with the data before anything goes on air. If the draft fails, standard wording goes out instead.',
  summary: {
    insights: 'Key moments',
    agent: 'Auto-written',
    template: 'Standard wording',
    pending: 'Still being written',
    rejected: 'Caught by the fact check',
    providers: 'Who wrote them',
  },
  listLabel: 'Key moments and their checks',
  empty: 'No key moments yet. They appear here as the replay runs.',
  error: "We couldn't load the fact-checks",
  loading: 'Loading the fact-checks',
  secretsNote:
    'Prompts, keys and passwords are never shown here; only what happened.',
  story: {
    caughtTitle: 'What the fact check caught',
  },
  technical: {
    status: 'Status',
    fallback: 'Raw fallback reason',
    insightId: 'Moment ID',
    gate: 'Fact check (publish gate)',
    gatePending: 'Gate has not run yet.',
    published: (n: number) => `${n} published`,
    templates: (n: number) => `${n} from templates`,
    overlayRevision: (r: number | null) =>
      r === null ? 'Overlay copy unchanged' : `Overlay revision ${r}`,
    rejected: 'Rejected items',
    noRejections: 'Nothing rejected.',
    runs: 'Run steps',
    noRuns: 'No agent runs recorded.',
    columns: {
      agent: 'Step',
      provider: 'Written by',
      model: 'Model',
      prompt: 'Prompt',
      latency: 'Time taken',
      retries: 'Retries',
      outcome: 'Result',
    },
    latency: (ms: number) => `${ms.toLocaleString('en-GB')} ms`,
    faultNotes: 'Demo failure notes',
  },
  notApplicable: '—',
} as const;

export const PUBLICATION_LABELS = {
  AGENT: 'Auto-written',
  TEMPLATE: 'Standard wording',
  PENDING: 'Pending',
} as const;

/** Honest provider names: standard wording or a test stand-in is never presented as AI. */
export const PROVIDER_LABELS: Record<
  ModelProvider,
  { label: string; hint: string }
> = {
  template: {
    label: 'Standard wording',
    hint: 'Pre-written sentences filled in from the match data',
  },
  mock: {
    label: 'Test stand-in (not real AI)',
    hint: 'A scripted test writer used for demos and tests; not a language model',
  },
  ollama: {
    label: 'AI (local model)',
    hint: 'An open AI model running on this machine',
  },
  foundry: {
    label: 'AI (Microsoft Foundry)',
    hint: 'An AI model deployed on Microsoft Foundry',
  },
};

export const AGENT_LABELS: Record<AgentName, string> = {
  MATCH_ANALYST: 'Analyst',
  NARRATIVE_WRITER: 'Writer',
  FACT_CHECKER: 'Fact checker',
  BROADCAST_PRODUCER: 'Graphics writer',
  LOCALIZATION: 'Translator',
};

export const OUTCOME_LABELS: Record<AgentRunOutcome, string> = {
  SUCCEEDED: 'Done',
  FAILED: 'Failed',
  TIMED_OUT: 'Took too long',
  FALLBACK: 'Used standard wording',
};

/**
 * Fallback reasons are free text from the agents service and the worker.
 * They are matched by pattern and shown as these sentences; the raw text
 * stays under Technical details (CONTENT_STYLE_GUIDE §3.4).
 */
export const FALLBACK_REASON_COPY: readonly {
  pattern: RegExp;
  text: string;
  group: FallbackGroup;
}[] = [
  ...THROUGHPUT_REASON_COPY,
  {
    pattern: /AI_ENABLED=false/i,
    text: 'AI writing is switched off here.',
    group: 'AI_OFF',
  },
  {
    pattern: /circuit breaker/i,
    text: 'Auto-writing paused briefly to recover.',
    group: 'AI_TROUBLE',
  },
  {
    pattern: /time(d)? ?out/i,
    text: 'Took too long, so standard wording went out on time.',
    group: 'AI_TROUBLE',
  },
  {
    pattern:
      /unreachable|HTTP \d+|invalid PipelineResult|orchestration|enqueue|unavailable/i,
    text: 'The writing service was unavailable.',
    group: 'AI_TROUBLE',
  },
  {
    pattern: /suppressed/i,
    text: 'Held back because it did not pass our checks.',
    group: 'HELD',
  },
  {
    pattern: /publish gate|fact checker|failed checks/i,
    text: 'The fact check rejected the draft.',
    group: 'FACT_CHECK',
  },
  {
    pattern: /skipped/i,
    text: 'Part of the analysis was skipped to stay on time.',
    group: 'AI_TROUBLE',
  },
];

export const FALLBACK_REASON_DEFAULT = {
  text: 'Standard wording was the safer choice here.',
  group: 'OTHER',
} as const;
export const FALLBACK_REASON_SEPARATOR = '; ';

/** Fact-check issue codes (`GateIssueCode`) in plain words. */
export const ISSUE_LABELS: Record<string, string> = {
  UNSUPPORTED_NUMBER: "A number that doesn't match the match data",
  UNKNOWN_ENTITY: "A player or team that isn't in this match",
  UNCITED_EVIDENCE: 'A claim with no plays to back it up',
  FORBIDDEN_CLAIM: "Wording we don't allow on air",
  SCHEMA_VIOLATION: 'Text in the wrong shape for a graphic',
  LENGTH_EXCEEDED: 'Too long for the graphic',
  UNREQUESTED_VARIANT: 'A version nobody asked for',
};

export const ISSUE_DEFAULT = 'Something that failed our checks';

export const ITEM_LABELS = {
  NARRATIVE: 'Write-up',
  OVERLAY: 'Graphic',
} as const;
