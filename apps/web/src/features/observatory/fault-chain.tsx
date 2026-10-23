import type { AgentRun } from '@matchiq/contracts';
import { Badge } from '@/components/ui';
import {
  DEMO_FAULT_COPY,
  FAULT_SCENARIO_SHORT,
  FAULT_STORY,
} from '@/constants/demo-faults';
import {
  AGENT_LABELS,
  OBSERVATORY_COPY,
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

const annotated = (runs: readonly AgentRun[]) =>
  [...runs]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .filter((r) => r.faultNote !== undefined);

/** A labelled demo failure told as a story: what we broke, how it recovered, what aired. */
export function FaultChain({ runs, publication }: FaultChainProps) {
  const scenario = faultOf(runs);
  if (scenario === null) return null;
  const tale = FAULT_STORY[scenario];
  return (
    <section
      aria-label={DEMO_FAULT_COPY.chainTitle}
      data-testid="fault-chain"
      className="rounded-md border border-warning/35 bg-warning/5 px-3 py-2"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Badge
          tone="warning"
          className="h-auto min-h-5 max-w-full whitespace-normal py-0.5"
        >
          {DEMO_FAULT_COPY.badge}: {FAULT_SCENARIO_SHORT[scenario]}
        </Badge>
        <h4 className="eyebrow">{DEMO_FAULT_COPY.chainTitle}</h4>
      </div>
      <p className="text-sm text-ink">
        {tale.setup} {publication === 'AGENT' ? tale.recovered : tale.fallback}
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        <span className="font-medium">{DEMO_FAULT_COPY.finalSource}</span>
        {`: ${PUBLICATION_LABELS[publication]}`}
      </p>
    </section>
  );
}

/** The raw annotated steps of a demo failure, for Technical details. */
export function FaultNotes({ runs }: { runs: readonly AgentRun[] }) {
  const steps = annotated(runs);
  if (faultOf(runs) === null || steps.length === 0) return null;
  return (
    <section data-testid="fault-notes">
      <h4 className="eyebrow mb-1">{OBSERVATORY_COPY.technical.faultNotes}</h4>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-ink">
        {steps.map((run, i) => (
          <li key={`${run.agent}-${run.startedAt}-${i}`}>
            <span className="font-medium">{AGENT_LABELS[run.agent]}</span>
            {` · ${OUTCOME_LABELS[run.outcome]} · `}
            <span className="font-mono text-ink-muted">{run.faultNote}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
