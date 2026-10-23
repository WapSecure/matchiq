import { SparkIcon } from '@/components/icons';
import { Badge } from '@/components/ui';
import { FACT_CHECKS_COPY } from '@/constants/fact-checks';
import { INSIGHT_KIND_LABELS } from '@/constants/match';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { cn } from '@/lib/cn';
import { formatClock, formatMinute } from '@/lib/format';
import { FaultChain } from './fault-chain';
import { describeRejection, plainFallbackReasons } from './plain-trace';
import { traceFacts, type Variants } from './trace-facts';
import { TraceFactsRow } from './trace-facts-row';
import { TraceTechnical } from './trace-technical';

const copy = FACT_CHECKS_COPY.facts;

const RAIL = {
  AGENT: 'before:bg-accent',
  TEMPLATE: 'before:bg-line-strong',
  PENDING: 'before:bg-line',
} as const;

const HEADER = {
  AGENT: 'bg-accent-soft/50',
  TEMPLATE: 'bg-surface-raised/60',
  PENDING: 'bg-surface-raised/60',
} as const;

type TraceCardProps = {
  trace: InsightTrace;
  /** Known once the recap exists; otherwise the clock within the period is shown. */
  period: number | null;
  variants: Variants | null;
};

export const momentAnchor = (insightId: string) => `moment-${insightId}`;

export const traceMinute = (trace: InsightTrace, period: number | null) =>
  period === null
    ? formatClock(1, trace.matchClockMs)
    : formatMinute(period, trace.matchClockMs);

function PublicationBadge({ trace }: { trace: InsightTrace }) {
  const ai = trace.publication === 'AGENT';
  return (
    <Badge tone={ai ? 'accent' : 'neutral'} className="ml-auto">
      {ai ? <SparkIcon size={11} /> : null}
      {copy.badge[trace.publication]}
    </Badge>
  );
}

function Notes({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <p className="text-[13px] text-ink-muted">
      <span className="font-medium text-ink">{title}: </span>
      {items.join(' ')}
    </p>
  );
}

export function TraceCard({ trace, period, variants }: TraceCardProps) {
  const kind = INSIGHT_KIND_LABELS[trace.kind];
  const titleId = `trace-${trace.insightId}`;
  const minute = traceMinute(trace, period);
  const why =
    trace.publication === 'TEMPLATE'
      ? plainFallbackReasons(trace.fallbackReason)
      : [];
  const caught = (trace.gate?.rejected ?? []).map(describeRejection);
  return (
    <article
      id={momentAnchor(trace.insightId)}
      aria-labelledby={titleId}
      data-publication={trace.publication}
      className={cn(
        'relative scroll-mt-24 overflow-hidden rounded-lg border border-line bg-surface shadow-panel',
        'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
        RAIL[trace.publication],
      )}
    >
      <header
        className={cn(
          'flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line py-2.5 pl-5 pr-4',
          HEADER[trace.publication],
        )}
      >
        <span className="tabular rounded-sm bg-surface-sunken px-1.5 py-0.5 font-mono text-xs font-semibold text-ink">
          {minute}
        </span>
        <h3 id={titleId} className="text-sm font-semibold text-ink">
          {kind}
        </h3>
        <PublicationBadge trace={trace} />
      </header>
      <div className="flex flex-col gap-3 py-3 pl-5 pr-4">
        <TraceFactsRow
          facts={traceFacts(trace, variants)}
          label={copy.label(kind, minute)}
        />
        <FaultChain runs={trace.runs} publication={trace.publication} />
        <Notes title={copy.why} items={why} />
        {caught.length > 0 ? (
          <section>
            <h4 className="text-[13px] font-medium text-ink">
              {OBSERVATORY_COPY.story.caughtTitle}
            </h4>
            <ul className="mt-0.5 flex flex-col gap-0.5 text-[13px] text-ink-muted">
              {caught.map((item, i) => (
                <li key={`${i}-${item}`}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <TraceTechnical
          trace={trace}
          caption={`${OBSERVATORY_COPY.technical.runs}: ${kind} ${minute}`}
        />
      </div>
    </article>
  );
}
