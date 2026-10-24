import type { AgentStep } from '@matchiq/contracts';
import { Badge } from '@/components/ui';
import {
  AGENT_STEP_COPY,
  STEP_DECISION_LABELS,
  STEP_DECISION_TONES,
  STEP_REASON_FALLBACK,
  STEP_REASONS,
  STEP_ROLE_LABELS,
} from '@/constants/agent-steps';
import { cn } from '@/lib/cn';
import { formatSeconds } from '@/lib/format';
import { describeMetric } from '@/lib/metric-definition';

const copy = AGENT_STEP_COPY;

const DOT: Record<AgentStep['decision'], string> = {
  PASS: 'bg-positive',
  REVISE: 'bg-warning',
  REJECT: 'bg-critical',
  FALLBACK: 'bg-ink-subtle',
};

export const plainReason = (step: AgentStep): string =>
  STEP_REASONS[step.reasonCode] ?? STEP_REASON_FALLBACK[step.decision];

function Evidence({ step }: { step: AgentStep }) {
  const events = step.evidenceEventIds.length;
  const stats = step.metricRefs.map((ref) => describeMetric(ref).label);
  if (events === 0 && stats.length === 0)
    return <p className="text-micro text-ink-subtle">{copy.noEvidence}</p>;
  return (
    <p className="text-micro text-ink-subtle">
      {copy.evidence(events, stats.length)}
      {stats.length > 0 ? `: ${stats.join(', ')}` : null}
    </p>
  );
}

/** One handoff in plain words; ids, versions and tokens live in Technical details. */
export function AgentStepItem({ step }: { step: AgentStep }) {
  return (
    <li className="relative flex flex-col gap-0.5 pb-3 pl-5 last:pb-0">
      <span
        aria-hidden
        className="absolute inset-y-0 left-[5px] w-px bg-line group-last/steps:hidden"
      />
      <span
        aria-hidden
        className={cn(
          'absolute left-0.5 top-1.5 size-2 rounded-full ring-2 ring-surface',
          DOT[step.decision],
        )}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[13px] font-medium text-ink">
          {STEP_ROLE_LABELS[step.role]}
        </span>
        <Badge tone={STEP_DECISION_TONES[step.decision]}>
          {STEP_DECISION_LABELS[step.decision]}
        </Badge>
        <span className="tabular ml-auto text-micro text-ink-subtle">
          {copy.took(formatSeconds(step.latencyMs))}
        </span>
      </div>
      <p className="text-[13px] text-ink-muted">{plainReason(step)}</p>
      <Evidence step={step} />
    </li>
  );
}
