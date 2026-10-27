import type { EvidenceEnvelope, Insight, MatchEvent } from '@matchiq/contracts';
import type { ReactNode } from 'react';
import { EVIDENCE_COPY } from '@/constants/evidence';
import { CONFIDENCE_LABELS, NOT_AVAILABLE } from '@/constants/match';
import { formatFraction, formatMinute, formatWindow } from '@/lib/format';
import { withUniqueKeys } from '@/lib/unique-keys';
import { describeEvent } from '../lib/describe-event';
import type { Roster } from '../lib/roster';

export function EvidenceSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line py-4 first:pt-0 last:border-0">
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
}

export function EvidenceSummary({ insight }: { insight: Insight }) {
  const e = insight.evidence;
  const rows: [string, string][] = [
    [
      EVIDENCE_COPY.fields.window,
      formatWindow(insight.period, e.windowStartMs, e.windowEndMs),
    ],
    [EVIDENCE_COPY.fields.confidence, CONFIDENCE_LABELS[e.confidenceLabel]],
    [EVIDENCE_COPY.fields.coverage, formatFraction(e.dataCoverage)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-ink-subtle">{label}</dt>
          <dd className="tabular truncate text-[13px] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type EvidenceEventsProps = {
  ids: readonly string[];
  events: readonly MatchEvent[];
  roster: Roster;
  resolving?: boolean;
};

export function EvidenceEvents({
  ids,
  events,
  roster,
  resolving = false,
}: EvidenceEventsProps) {
  const byId = new Map(events.map((e) => [e.eventId, e]));
  return (
    <ol className="flex flex-col gap-1.5">
      {withUniqueKeys(ids, String).map(({ item: id, key }) => {
        const event = byId.get(id);
        const described = event ? describeEvent(event, roster) : null;
        return (
          <li key={key} className="grid grid-cols-[5rem_1fr] gap-2 text-sm">
            <span className="tabular font-mono text-xs text-ink-subtle">
              {event
                ? formatMinute(event.period, event.matchClockMs)
                : NOT_AVAILABLE}
            </span>
            <div className="min-w-0">
              <p className="text-ink">
                {described?.label ??
                  (resolving
                    ? EVIDENCE_COPY.resolving
                    : EVIDENCE_COPY.eventOutsideWindow)}
              </p>
              {described?.detail ? (
                <p className="truncate text-micro text-ink-subtle">
                  {described.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function CounterEvidenceList({
  evidence,
}: {
  evidence: EvidenceEnvelope;
}) {
  if (evidence.counterEvidence.length === 0) {
    return <p className="text-xs text-ink-subtle">{EVIDENCE_COPY.noCounter}</p>;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {withUniqueKeys(evidence.counterEvidence, (c) => c.description).map(
        ({ item, key }) => (
          <li
            key={key}
            className="rounded-md border border-line bg-surface-sunken p-2"
          >
            <p className="text-ink">{item.description}</p>
          </li>
        ),
      )}
    </ul>
  );
}

export { EvidenceMetrics } from './evidence-metrics';
export { EvidenceTechnical } from './evidence-technical';
