import type { AgentStepDecision, AgentStepRole } from '@matchiq/contracts';
import type { BadgeTone } from '@/components/ui/badge';
import { AGENT_LABELS } from './observatory';

export const AGENT_TRACE_PATH = (correlationId: string) =>
  `/agents/traces/${encodeURIComponent(correlationId)}`;

export const AGENT_STEPS_QUERY_KEY = 'agent-traces';
export const AGENT_STEPS_PAGE_SIZE = 6;
/** Handoff records never change once stored. */
export const AGENT_STEPS_STALE_MS = 5 * 60_000;
export const HASH_PREVIEW_LENGTH = 12;
export const NOT_FOUND_STATUS = 404;

export const AGENT_STEP_COPY = {
  title: 'How the agents worked on this',
  description:
    'Each handoff between the agents, in order: what it decided, why, and the evidence it used.',
  listLabel: (moment: string) => `Agent handoffs for ${moment}`,
  loading: 'Loading how the agents worked on this',
  pending: 'The agents are still working on this moment.',
  empty: 'No handoffs were recorded for this moment.',
  error: "We couldn't load how the agents worked on this",
  took: (seconds: string) => `Took ${seconds}`,
  evidence: (events: number, stats: number) =>
    `Used ${events} match ${events === 1 ? 'event' : 'events'} and ${stats} ${stats === 1 ? 'statistic' : 'statistics'}`,
  noEvidence: 'Used no match evidence',
  moreLabel: 'More agent handoffs',
  noun: { one: 'handoff', other: 'handoffs' },
  technical: {
    title: 'Agent handoffs',
    hint: 'One row per handoff; checksums are SHA-256 of what the agent received',
    caption: (moment: string) => `Agent handoff records for ${moment}`,
    none: 'No handoff records stored.',
    columns: {
      step: 'Step',
      agent: 'Agent',
      transition: 'Stage',
      model: 'Model',
      version: 'Prompt version',
      hash: 'Prompt hash',
      checksum: 'Input checksum',
      tokens: 'Tokens in / out',
      cost: 'Cost estimate',
      retries: 'Retries',
    },
    transition: (from: string, to: string) => `${from} → ${to}`,
    tokens: (tokensIn?: number, tokensOut?: number) =>
      `${tokensIn ?? '–'} / ${tokensOut ?? '–'}`,
    cost: (usd?: number) => (usd === undefined ? '–' : `$${usd.toFixed(4)}`),
  },
} as const;

export const STEP_ROLE_LABELS: Record<AgentStepRole, string> = {
  ...AGENT_LABELS,
  TEMPLATE_FALLBACK: 'Safe template',
};

export const STEP_DECISION_LABELS: Record<AgentStepDecision, string> = {
  PASS: 'Passed',
  REVISE: 'Sent back',
  REJECT: 'Stopped',
  FALLBACK: 'Used a template',
};

export const STEP_DECISION_TONES: Record<AgentStepDecision, BadgeTone> = {
  PASS: 'positive',
  REVISE: 'warning',
  REJECT: 'critical',
  FALLBACK: 'neutral',
};

/** Reason codes from the agents service, in the words a producer would use. */
export const STEP_REASONS: Record<string, string> = {
  GROUNDED: 'Every point it made is backed by match events.',
  TIME_BUDGET:
    'Skipped so the writer had enough time; a prepared summary was used.',
  MODEL_FALLBACK:
    'The AI did not give a usable answer, so prepared wording took over.',
  DRAFTED: 'Wrote the drafts and passed them to the fact checker.',
  VERIFIED: 'Every draft matched the match evidence.',
  REVISION_REQUESTED: 'Found a problem and asked the writer to fix it.',
  DRAFTS_REJECTED: 'Stopped drafts that did not match the evidence.',
  TEMPLATE_USED: 'Prepared wording filled in what the agents could not.',
  TEMPLATE_FAILED:
    'Even the prepared wording failed the checks, so nothing aired.',
  LOCALISED: 'Translated without changing any number or name.',
  LOCALE_FALLBACK: 'Some translations were swapped for prepared wording.',
  OVERLAY_READY: 'Wrote the on-screen graphic and it passed the checks.',
  OVERLAY_FALLBACK: 'The graphic failed the checks, so the prepared one aired.',
  ORCHESTRATION_ERROR:
    'Something went wrong partway, so prepared wording was used.',
  BUDGET_EXCEEDED:
    'Reached the spending limit for this moment, so prepared wording was used.',
};

export const STEP_REASON_FALLBACK: Record<AgentStepDecision, string> = {
  PASS: 'Finished its part and passed it on.',
  REVISE: 'Asked for changes before passing it on.',
  REJECT: 'Stopped the work from going further.',
  FALLBACK: 'Prepared wording was used for this part.',
};
