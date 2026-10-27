'use client';

import type { AgentRun } from '@matchiq/contracts';
import {
  AGENT_LABELS,
  OBSERVATORY_COPY,
  OUTCOME_LABELS,
} from '@/constants/observatory';
import { useInterfaceLanguage } from '@/features/interface-language/interface-language-store';
import { cn } from '@/lib/cn';
import { withUniqueKeys } from '@/lib/unique-keys';
import { ProviderBadge } from './provider-badge';

const copy = OBSERVATORY_COPY.technical;

const COLUMNS = [
  { label: copy.columns.agent, numeric: false },
  { label: copy.columns.provider, numeric: false },
  { label: copy.columns.model, numeric: false },
  { label: copy.columns.prompt, numeric: false },
  { label: copy.columns.latency, numeric: true },
  { label: copy.columns.retries, numeric: true },
  { label: copy.columns.outcome, numeric: false },
];

const OUTCOME_TONE: Record<AgentRun['outcome'], string> = {
  SUCCEEDED: 'bg-positive',
  FAILED: 'bg-critical',
  TIMED_OUT: 'bg-warning',
  FALLBACK: 'bg-ink-subtle',
};

const CELL = 'px-3 py-2 align-middle';

// runId is shared by every agent step of one insight's pipeline run.
const runKey = (r: AgentRun) =>
  `${r.runId}:${r.agent}:${r.provider}:${r.startedAt}`;

/** AgentRun timeline in start order. Scrolls inside itself on narrow screens. */
export function RunTable({
  runs,
  caption,
}: {
  runs: readonly AgentRun[];
  caption: string;
}) {
  const locale = useInterfaceLanguage((state) => state.locale);
  if (runs.length === 0)
    return <p className="text-xs text-ink-subtle">{copy.noRuns}</p>;
  const ordered = withUniqueKeys(
    [...runs].sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    runKey,
  );
  return (
    <div
      className="overflow-x-auto rounded-md border border-line"
      tabIndex={0}
      role="group"
      aria-label={caption}
    >
      <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-sunken text-ink-muted">
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn(CELL, 'font-medium', c.numeric && 'text-right')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {ordered.map(({ item: run, key }) => (
            <tr key={key} className="border-t border-line">
              <th scope="row" className={cn(CELL, 'font-medium text-ink')}>
                {AGENT_LABELS[run.agent]}
              </th>
              <td className={CELL}>
                <ProviderBadge provider={run.provider} inline />
              </td>
              <td className={cn(CELL, 'font-mono text-ink-muted')}>
                {run.modelDeployment ?? OBSERVATORY_COPY.notApplicable}
              </td>
              <td className={cn(CELL, 'font-mono text-ink-muted')}>
                v{run.promptVersion}
              </td>
              <td className={cn(CELL, 'tabular text-right font-mono text-ink')}>
                {run.latencyMs.toLocaleString(locale)} ms
              </td>
              <td className={cn(CELL, 'tabular text-right font-mono text-ink')}>
                {run.retries}
              </td>
              <td className={cn(CELL, 'whitespace-nowrap text-ink')}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn(
                      'size-1.5 rounded-full',
                      OUTCOME_TONE[run.outcome],
                    )}
                  />
                  {OUTCOME_LABELS[run.outcome]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
