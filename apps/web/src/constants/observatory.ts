import type {
  AgentName,
  AgentRunOutcome,
  ModelProvider,
} from '@matchiq/contracts';

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export const OBSERVATORY_COPY = {
  metaTitle: 'AI fact-checks',
  eyebrow: 'AI fact-checks',
  title: 'How each key moment was written and checked',
  description:
    'Key moments are spotted in the match data. AI writes them up, and a fact check compares every number, name and claim with the data before anything goes on air. If the AI wording fails, standard wording goes out instead.',
  summary: {
    insights: 'Key moments',
    agent: 'Written by AI',
    template: 'Standard wording',
    pending: 'Still being written',
    rejected: 'Caught by the fact check',
    providers: 'Who wrote them',
  },
  listLabel: 'Key moments and their checks',
  empty: 'No key moments yet. They appear here as the replay runs.',
  error: "We couldn't load the AI fact-checks",
  loading: 'Loading the AI fact-checks',
  secretsNote:
    'Prompts, keys and passwords are never shown here; only what happened.',
  story: {
    region: (kind: string, minute: string) => `${kind} at ${minute}`,
    spotted: (minute: string) => `Spotted at ${minute}`,
    written: {
      AGENT: 'Written by AI',
      TEMPLATE: 'Standard wording',
      PENDING: 'Being written…',
    },
    checkPending: 'Fact check pending',
    checked: 'Fact-checked ✓',
    caught: (n: number) => `Fact check caught ${plural(n, 'problem')}`,
    graphic: {
      aiWording: 'Graphic updated with AI wording',
      standard: 'Graphic kept standard wording',
      RETRACTED: 'Taken off air by a producer',
      HELD: 'Graphic held by a producer',
      SUPPRESSED: 'Dropped by a producer',
    },
    versions: (n: number) => plural(n, 'version'),
    why: 'Why standard wording?',
    caughtTitle: 'What the fact check caught',
  },
  technical: {
    status: 'Pipeline status',
    fallback: 'Fallback reason (raw)',
    insightId: 'Insight id',
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
    latency: (ms: number) => `${ms.toLocaleString('en-GB')} ms`,
    faultNotes: 'Demo failure notes',
  },
  notApplicable: '—',
} as const;

export const PUBLICATION_LABELS = {
  AGENT: 'AI wording',
  TEMPLATE: 'Standard wording',
  PENDING: 'Pending',
} as const;

/** Honest provider names: standard wording or a test stand-in is never presented as AI. */
export const PROVIDER_LABELS: Record<
  ModelProvider,
  { label: string; hint: string }
> = {
  template: {
    label: 'Standard wording (no AI)',
    hint: 'Pre-written sentences filled in from the match data; no AI was used',
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
}[] = [
  {
    pattern: /AI_ENABLED=false/i,
    text: 'AI writing is switched off here, so standard wording was used.',
  },
  {
    pattern: /circuit breaker/i,
    text: 'AI writing paused briefly to recover from delays, so standard wording was used.',
  },
  {
    pattern: /time(d)? ?out/i,
    text: 'The AI took too long, so standard wording went out on time.',
  },
  {
    pattern: /unreachable|HTTP \d+|invalid PipelineResult|orchestration|enqueue|unavailable/i,
    text: 'The AI service had a problem, so standard wording was used.',
  },
  {
    pattern: /suppressed/i,
    text: 'This moment was held back because it did not pass our checks.',
  },
  {
    pattern: /publish gate|fact checker|failed checks/i,
    text: 'The fact check found a problem with the AI wording, so standard wording was used.',
  },
  {
    pattern: /skipped/i,
    text: 'Part of the AI analysis was skipped to stay on time.',
  },
];

export const FALLBACK_REASON_DEFAULT =
  'Standard wording was used for this moment.';
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
