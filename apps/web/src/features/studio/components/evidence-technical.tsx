import type { Insight } from '@matchiq/contracts';
import { TechnicalDetails } from '@/components/ui';
import { EVIDENCE_COPY } from '@/constants/evidence';
import { MetricFormulas } from './evidence-metrics';

/** Ids, versions, codes and formulas behind the evidence, collapsed by default. */
export function EvidenceTechnical({ insight }: { insight: Insight }) {
  const t = EVIDENCE_COPY.technical;
  const e = insight.evidence;
  const rows: [string, string][] = [
    [t.insightId, insight.insightId],
    [t.method, e.methodVersion],
    [t.reason, insight.reasonCode],
    [t.status, insight.status],
    [t.events, e.eventIds.join(', ')],
  ];
  return (
    <TechnicalDetails className="mt-3">
      <dl className="grid gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-micro text-ink-subtle">{label}</dt>
            <dd className="break-all font-mono text-micro text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <p className="mb-1 text-micro text-ink-subtle">{t.metrics}</p>
        <MetricFormulas evidence={e} />
      </div>
    </TechnicalDetails>
  );
}
