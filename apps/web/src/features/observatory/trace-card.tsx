import type { ReactNode } from 'react';
import { Badge, TechnicalDetails } from '@/components/ui';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { OBSERVATORY_COPY, PUBLICATION_LABELS } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { formatClock, formatMinute } from '@/lib/format';
import { FaultChain, FaultNotes } from './fault-chain';
import { GateReportView } from './gate-report';
import { describeRejection, plainFallbackReasons, traceStory } from './plain-trace';
import { RunTable } from './run-table';

const copy = OBSERVATORY_COPY;
const tech = copy.technical;

const PUBLICATION_TONE = {
  AGENT: 'accent',
  TEMPLATE: 'neutral',
  PENDING: 'neutral',
} as const;

type TraceCardProps = {
  trace: InsightTrace;
  /** Known once the recap exists; otherwise the clock within the period is shown. */
  period: number | null;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-ink-subtle">{label}</dt>
      <dd className="break-words font-mono text-xs text-ink">{children}</dd>
    </div>
  );
}

function Notes({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h4 className="eyebrow mb-1">{title}</h4>
      <ul className="flex flex-col gap-0.5 text-xs text-ink">
        {items.map((item, i) => (
          <li key={`${i}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function Technical({ trace, caption }: { trace: InsightTrace; caption: string }) {
  return (
    <TechnicalDetails>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Field label={tech.status}>{trace.status}</Field>
        <Field label={tech.fallback}>
          {trace.fallbackReason ?? copy.notApplicable}
        </Field>
        <Field label={tech.insightId}>{trace.insightId}</Field>
      </dl>
      <FaultNotes runs={trace.runs} />
      <section>
        <h4 className="eyebrow mb-1.5">{tech.gate}</h4>
        <GateReportView report={trace.gate} />
      </section>
      <section>
        <h4 className="eyebrow mb-1.5">{tech.runs}</h4>
        <RunTable runs={trace.runs} caption={caption} />
      </section>
    </TechnicalDetails>
  );
}

export function TraceCard({ trace, period }: TraceCardProps) {
  const kind = INSIGHT_KIND_LABELS[trace.kind];
  const titleId = `trace-${trace.insightId}`;
  const minute =
    period === null
      ? formatClock(1, trace.matchClockMs)
      : formatMinute(period, trace.matchClockMs);
  const why =
    trace.publication === 'TEMPLATE'
      ? plainFallbackReasons(trace.fallbackReason)
      : [];
  return (
    <article
      aria-labelledby={titleId}
      data-publication={trace.publication}
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-panel"
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-raised/60 px-4 py-2.5">
        <h3 id={titleId} className="text-sm font-semibold text-ink">
          {kind}
        </h3>
        <span className="tabular font-mono text-xs text-ink-subtle">
          {minute}
        </span>
        <Badge tone={PUBLICATION_TONE[trace.publication]} className="ml-auto">
          {PUBLICATION_LABELS[trace.publication]}
        </Badge>
      </header>
      <div className="flex flex-col gap-3 px-4 py-3">
        <ol
          aria-label={copy.story.region(kind, minute)}
          data-testid="trace-story"
          className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink [&>li+li]:before:mr-2 [&>li+li]:before:text-ink-subtle [&>li+li]:before:content-['·']"
        >
          {traceStory(trace, minute).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <FaultChain runs={trace.runs} publication={trace.publication} />
        <Notes title={copy.story.why} items={why} />
        <Notes
          title={copy.story.caughtTitle}
          items={(trace.gate?.rejected ?? []).map(describeRejection)}
        />
        <Technical trace={trace} caption={`${tech.runs}: ${kind} ${minute}`} />
      </div>
    </article>
  );
}
