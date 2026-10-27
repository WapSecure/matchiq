import type { AgentStep, AgentStepRole } from '@matchiq/contracts';
import {
  STEP_DECISION_LABELS,
  STEP_ROLE_LABELS,
} from '@/constants/agent-steps';
import {
  EXTRA_ROLES,
  GATE_OUTCOMES,
  MAIN_ROLES,
  MOMENT_TRACE_COPY,
  STANDARD_WORDING_PREFIX,
  WRITER_LINES,
} from '@/constants/moment-trace';
import { FALLBACK_REASON_DEFAULT } from '@/constants/observatory';
import {
  describeRejection,
  plainFallbackReasons,
} from '@/features/observatory/plain-trace';
import { hasQueueWait, queueWaitLine } from '@/features/observatory/queue-wait';
import { splitRejections } from '@/features/observatory/rejection-split';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { formatSeconds } from '@/lib/format';

export type ChainLink = {
  key: string;
  label: string;
  outcome: string;
  tone: AgentStep['decision'];
  /** Empty when the stage reports no time, such as the publish gate. */
  duration: string;
};

export type MomentChain = {
  links: ChainLink[];
  extras: ChainLink[];
  caught: string[];
  /** Wording held back for style (such as repeating itself), not for a fact. */
  heldBack: string[];
  finalLine: string | null;
  standardReason: boolean;
  /** Quiet note when the moment queued before writing started. */
  waitLine?: string | null;
  /** True when step times follow a long wait and are not shown as model time. */
  waited?: boolean;
};

const link = (role: AgentStepRole, steps: readonly AgentStep[]): ChainLink => {
  const mine = steps.filter((s) => s.role === role);
  const last = mine[mine.length - 1] as AgentStep;
  const ms = mine.reduce((sum, s) => sum + s.latencyMs, 0);
  return {
    key: role,
    label: STEP_ROLE_LABELS[role],
    outcome: STEP_DECISION_LABELS[last.decision],
    tone: last.decision,
    duration: ms > 0 ? formatSeconds(ms) : '',
  };
};

const linksFor = (
  roles: readonly AgentStepRole[],
  steps: readonly AgentStep[],
) =>
  roles
    .filter((r) => steps.some((s) => s.role === r))
    .map((r) => link(r, steps));

const gateLink = (trace: InsightTrace): ChainLink | null => {
  if (!trace.gate || trace.publication === 'PENDING') return null;
  const stopped = Boolean(trace.editorial?.insight);
  const aired = trace.publication === 'AGENT';
  return {
    key: 'GATE',
    label: MOMENT_TRACE_COPY.gate,
    outcome: stopped
      ? GATE_OUTCOMES.stopped
      : aired
        ? GATE_OUTCOMES.passed
        : GATE_OUTCOMES.template,
    tone: stopped ? 'REJECT' : aired ? 'PASS' : 'FALLBACK',
    duration: '',
  };
};

const writerProvider = (trace: InsightTrace): string =>
  trace.runs.find((r) => r.agent === 'NARRATIVE_WRITER')?.provider ?? 'default';

/** Who wrote the final wording, in plain words; null while still being written. */
export const finalLineFor = (trace: InsightTrace): string | null => {
  if (trace.publication === 'PENDING') return null;
  if (trace.publication === 'TEMPLATE') {
    const reason = plainFallbackReasons(trace.fallbackReason).join(' ');
    return `${STANDARD_WORDING_PREFIX}: ${reason || FALLBACK_REASON_DEFAULT.text}`;
  }
  return WRITER_LINES[writerProvider(trace)] ?? WRITER_LINES['default'] ?? null;
};

export const buildChain = (
  trace: InsightTrace,
  steps: readonly AgentStep[],
): MomentChain => {
  const main = linksFor(MAIN_ROLES, steps);
  const gate = gateLink(trace);
  const split = splitRejections(trace.gate?.rejected ?? []);
  return {
    links: steps.length === 0 ? [] : gate ? [...main, gate] : main,
    extras: linksFor(EXTRA_ROLES, steps),
    caught: split.caught.map(describeRejection),
    heldBack: split.heldBack.map(describeRejection),
    finalLine: finalLineFor(trace),
    standardReason: trace.publication === 'TEMPLATE',
    waitLine: queueWaitLine(trace.queueWaitMs),
    waited: hasQueueWait(trace.queueWaitMs),
  };
};
