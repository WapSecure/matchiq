import type { ReactNode } from 'react';
import { Badge } from '@/components/ui';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { OBSERVATORY_COPY, PUBLICATION_LABELS } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { formatClock, formatMinute } from '@/lib/format';
import { GateReportView } from './gate-report';
import { RunTable } from './run-table';

const copy = OBSERVATORY_COPY;

const PUBLICATION_TONE = {
  AGENT: 'accent',
  TEMPLATE: 'neutral',
  PENDING: 'neutral',
} as const;

type TraceCardProps = {
  trace: InsightTrace;
  /** Known once the recap exists; otherwise the period clock is shown. */
  period: number | null;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-ink-subtle">{label}</dt>
      <dd className="text-xs text-ink">{children}</dd>
    </div>
  );
}

export function TraceCard({ trace, period }: TraceCardProps) {
  const kind = INSIGHT_KIND_LABELS[trace.kind];
  const titleId = `trace-${trace.insightId}`;
  const minute =
    period === null
      ? `${copy.periodClock} ${formatClock(1, trace.matchClockMs)}`
      : formatMinute(period, trace.matchClockMs);
  return (
    <article
      aria-labelledby={titleId}
      data-publication={trace.publication}
      className="rounded-lg border border-line bg-surface"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
        <h3 id={titleId} className="text-sm font-semibold text-ink">
          {kind}
        </h3>
        <span className="tabular font-mono text-xs text-ink-subtle">
          {minute}
        </span>
        <Badge tone={PUBLICATION_TONE[trace.publication]} className="ml-auto">
          {copy.publication}: {PUBLICATION_LABELS[trace.publication]}
        </Badge>
      </header>
      <div className="flex flex-col gap-4 px-4 py-3">
        <dl className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <Field label={copy.status}>
            <span className="font-mono">{trace.status}</span>
          </Field>
          <Field label={copy.fallback}>
            {trace.fallbackReason ?? copy.notApplicable}
          </Field>
        </dl>
        <section>
          <h4 className="eyebrow mb-1.5">{copy.gate}</h4>
          <GateReportView report={trace.gate} />
        </section>
        <section>
          <h4 className="eyebrow mb-1.5">{copy.runs}</h4>
          <RunTable
            runs={trace.runs}
            caption={`${copy.runs}: ${kind} ${minute}`}
          />
        </section>
      </div>
    </article>
  );
}
