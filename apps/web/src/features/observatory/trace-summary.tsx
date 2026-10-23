import type { ModelProvider } from '@matchiq/contracts';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { ProviderBadge } from './provider-badge';

const copy = OBSERVATORY_COPY.summary;

export const summarise = (traces: readonly InsightTrace[]) => {
  const count = (p: InsightTrace['publication']) =>
    traces.filter((t) => t.publication === p).length;
  const providers = [
    ...new Set(traces.flatMap((t) => t.runs.map((r) => r.provider))),
  ].sort() as ModelProvider[];
  return {
    total: traces.length,
    agent: count('AGENT'),
    template: count('TEMPLATE'),
    pending: count('PENDING'),
    rejected: traces.reduce((n, t) => n + (t.gate?.rejected.length ?? 0), 0),
    providers,
  };
};

export function TraceSummary({ traces }: { traces: readonly InsightTrace[] }) {
  const s = summarise(traces);
  const tiles: [string, number][] = [
    [copy.insights, s.total],
    [copy.agent, s.agent],
    [copy.template, s.template],
    [copy.pending, s.pending],
    [copy.rejected, s.rejected],
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-panel sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value]) => (
        <div key={label} className="bg-surface px-4 py-3">
          <dt className="text-micro text-ink-subtle">{label}</dt>
          <dd className="tabular mt-1 font-mono text-2xl font-semibold tracking-tight text-ink">
            {value}
          </dd>
        </div>
      ))}
      <div className="bg-surface px-4 py-3">
        <dt className="text-micro text-ink-subtle">{copy.providers}</dt>
        <dd className="mt-1 flex flex-wrap gap-1">
          {s.providers.map((p) => (
            <ProviderBadge key={p} provider={p} />
          ))}
        </dd>
      </div>
    </dl>
  );
}
