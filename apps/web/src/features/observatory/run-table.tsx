import type { AgentRun } from '@matchiq/contracts';
import {
  AGENT_LABELS,
  OBSERVATORY_COPY,
  OUTCOME_LABELS,
} from '@/constants/observatory';
import { cn } from '@/lib/cn';
import { ProviderBadge } from './provider-badge';

const copy = OBSERVATORY_COPY;
const COLUMNS = [
  copy.columns.agent,
  copy.columns.provider,
  copy.columns.model,
  copy.columns.prompt,
  copy.columns.latency,
  copy.columns.retries,
  copy.columns.outcome,
];

const OUTCOME_TONE: Record<AgentRun['outcome'], string> = {
  SUCCEEDED: 'text-positive',
  FAILED: 'text-critical',
  TIMED_OUT: 'text-warning',
  FALLBACK: 'text-ink-muted',
};

/** AgentRun timeline in start order. Scrolls inside itself on narrow screens. */
export function RunTable({
  runs,
  caption,
}: {
  runs: readonly AgentRun[];
  caption: string;
}) {
  if (runs.length === 0)
    return <p className="text-xs text-ink-subtle">{copy.noRuns}</p>;
  const ordered = [...runs].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="group"
      aria-label={caption}
    >
      <table className="w-full min-w-[36rem] text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="text-ink-subtle">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="pb-1 pr-3 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.map((run) => (
            <tr key={run.runId} className="border-t border-line/60">
              <th scope="row" className="py-1.5 pr-3 font-medium text-ink">
                {AGENT_LABELS[run.agent]}
              </th>
              <td className="py-1.5 pr-3">
                <ProviderBadge provider={run.provider} />
              </td>
              <td className="py-1.5 pr-3 font-mono text-ink-muted">
                {run.modelDeployment ?? copy.notApplicable}
              </td>
              <td className="py-1.5 pr-3 font-mono text-ink-muted">
                v{run.promptVersion}
              </td>
              <td className="tabular py-1.5 pr-3 text-ink">
                {copy.latency(run.latencyMs)}
              </td>
              <td className="tabular py-1.5 pr-3 text-ink">{run.retries}</td>
              <td
                className={cn('py-1.5 font-medium', OUTCOME_TONE[run.outcome])}
              >
                {OUTCOME_LABELS[run.outcome]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
