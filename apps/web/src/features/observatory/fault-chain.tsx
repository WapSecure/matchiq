import type { AgentRun } from '@matchiq/contracts';
import { Badge } from '@/components/ui';
import { DEMO_FAULT_COPY, FAULT_SCENARIO_SHORT } from '@/constants/demo-faults';
import {
  AGENT_LABELS,
  OUTCOME_LABELS,
  PUBLICATION_LABELS,
} from '@/constants/observatory';
import type { InsightPublication } from '@/lib/api/trace-schemas';

type FaultChainProps = {
  runs: readonly AgentRun[];
  publication: InsightPublication;
};

/** The faulted scenario of a trace, or null when no run was simulated. */
export const faultOf = (runs: readonly AgentRun[]) =>
  runs.find((r) => r.faultInjected !== undefined)?.faultInjected ?? null;

/** Labelled demo failure: each annotated step in order, then what went on air. */
export function FaultChain({ runs, publication }: FaultChainProps) {
  const scenario = faultOf(runs);
  if (scenario === null) return null;
  const steps = [...runs]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .filter((r) => r.faultNote !== undefined);
  return (
    <section
      aria-label={DEMO_FAULT_COPY.chainTitle}
      data-testid="fault-chain"
      className="rounded-md border border-warning/35 bg-warning/5 px-3 py-2"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge tone="warning">
          {DEMO_FAULT_COPY.badge}: {FAULT_SCENARIO_SHORT[scenario]}
        </Badge>
        <h4 className="eyebrow">{DEMO_FAULT_COPY.chainTitle}</h4>
      </div>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-xs text-ink">
        {steps.map((run, i) => (
          <li key={`${run.agent}-${run.startedAt}-${i}`}>
            <span className="font-medium">{AGENT_LABELS[run.agent]}</span>
            {` · ${OUTCOME_LABELS[run.outcome]} · `}
            <span className="text-ink-muted">{run.faultNote}</span>
          </li>
        ))}
        <li>
          <span className="font-medium">{DEMO_FAULT_COPY.finalSource}</span>
          {`: ${PUBLICATION_LABELS[publication]}`}
        </li>
      </ol>
    </section>
  );
}
