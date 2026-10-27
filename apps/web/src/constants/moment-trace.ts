import type { AgentStepRole } from '@matchiq/contracts';

export const MOMENT_TRACE_COPY = {
  title: 'How this was written',
  loading: 'Loading how this was written',
  empty: 'No agent steps were recorded for this moment.',
  error: "We couldn't load how this was written",
  pending: 'This moment is still being written.',
  chainLabel: (moment: string) => `Steps behind ${moment}`,
  gate: 'Publish gate',
  also: 'Also',
  caught: (n: number) => `Caught ${n} ${n === 1 ? 'problem' : 'problems'}`,
  caughtLabel: 'What the fact check caught',
  heldBackLabel: 'Held back for wording, not facts',
  heldBack: (n: number) =>
    `Held back ${n} ${n === 1 ? 'wording' : 'wordings'} for repeating itself`,
  tookLabel: (seconds: string) => `Took ${seconds}`,
} as const;

export const GATE_OUTCOMES = {
  passed: 'Passed',
  template: 'Used a template',
  stopped: 'Stopped',
} as const;

/** Final wording line by who wrote it; unknown providers get the default line. */
export const WRITER_LINES: Record<string, string> = {
  default: 'Written by a model and fact-checked',
  mock: 'Written by a test stand-in, not a real model, and fact-checked',
  recorded:
    "Recorded model run: wording written earlier and replayed through today's checks",
};

export const STANDARD_WORDING_PREFIX = 'Standard wording';

export const MAIN_ROLES: readonly AgentStepRole[] = [
  'MATCH_ANALYST',
  'NARRATIVE_WRITER',
  'FACT_CHECKER',
  'TEMPLATE_FALLBACK',
];

export const EXTRA_ROLES: readonly AgentStepRole[] = [
  'LOCALIZATION',
  'BROADCAST_PRODUCER',
];
