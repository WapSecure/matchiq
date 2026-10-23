import type { ReactNode } from 'react';
import { TechnicalDetails } from '@/components/ui';
import { FACT_CHECKS_COPY } from '@/constants/fact-checks';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { FaultNotes } from './fault-chain';
import { GateReportView } from './gate-report';
import { RunTable } from './run-table';

const tech = OBSERVATORY_COPY.technical;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-3 py-2">
      <dt className="text-micro text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 break-words font-mono text-xs text-ink">
        {children}
      </dd>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <header className="flex flex-wrap items-baseline gap-x-2">
        <h4 className="text-xs font-semibold text-ink">{title}</h4>
        {hint ? (
          <span className="text-micro text-ink-subtle">{hint}</span>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/** Opt-in raw detail for engineers and judges: ids, gate verdict, run steps. */
export function TraceTechnical({
  trace,
  caption,
}: {
  trace: InsightTrace;
  caption: string;
}) {
  return (
    <TechnicalDetails>
      <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
        <Field label={tech.status}>{trace.status}</Field>
        <Field label={tech.fallback}>
          {trace.fallbackReason ?? OBSERVATORY_COPY.notApplicable}
        </Field>
        <Field label={tech.insightId}>{trace.insightId}</Field>
      </dl>
      <FaultNotes runs={trace.runs} />
      <Section title={tech.gate}>
        <GateReportView report={trace.gate} />
      </Section>
      <Section title={tech.runs} hint={FACT_CHECKS_COPY.technical.runsHint}>
        <RunTable runs={trace.runs} caption={caption} />
      </Section>
    </TechnicalDetails>
  );
}
