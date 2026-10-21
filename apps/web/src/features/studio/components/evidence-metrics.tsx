import type { EvidenceEnvelope } from '@matchiq/contracts';
import { EVIDENCE_COPY } from '@/constants/evidence';
import { describeMetric } from '@/lib/metric-definition';

const METRIC_DECIMALS = 2;

/** Engine-computed values with the definition of each metricRef. */
export function EvidenceMetrics({ evidence }: { evidence: EvidenceEnvelope }) {
  const entries = Object.entries(evidence.computedMetrics);
  if (entries.length === 0)
    return <p className="text-xs text-ink-subtle">{EVIDENCE_COPY.noMetrics}</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-ink-subtle">
        <tr>
          <th scope="col" className="pb-1 font-normal">
            {EVIDENCE_COPY.metricsTable.metric}
          </th>
          <th scope="col" className="pb-1 text-right font-normal">
            {EVIDENCE_COPY.metricsTable.value}
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([ref, value]) => {
          const definition = describeMetric(ref);
          return (
            <tr key={ref} className="border-t border-line/60 align-top">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                <span className="block text-[13px] text-ink">
                  {definition.label}
                </span>
                <span className="block font-mono text-micro text-ink-subtle">
                  {ref}
                </span>
                {definition.formula ? (
                  <span className="block text-micro text-ink-subtle">
                    {definition.formula}
                  </span>
                ) : null}
              </th>
              <td className="tabular py-1.5 text-right font-semibold text-ink">
                {Number.isInteger(value)
                  ? value
                  : value.toFixed(METRIC_DECIMALS)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
