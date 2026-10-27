import { FACT_CHECKS_COPY, PERCENT } from '@/constants/fact-checks';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { cn } from '@/lib/cn';
import { summarise } from './moment-filters';
import { ProviderBadge } from './provider-badge';

const copy = FACT_CHECKS_COPY;

const SEGMENTS = [
  { key: 'agent', label: copy.share.legend.AGENT, fill: 'bg-accent' },
  {
    key: 'template',
    label: copy.share.legend.TEMPLATE,
    fill: 'bg-ink-subtle/45',
  },
  {
    key: 'pending',
    label: copy.share.legend.PENDING,
    fill: 'bg-surface-sunken ring-1 ring-inset ring-line-strong',
  },
] as const;

type Summary = ReturnType<typeof summarise>;

function ShareOfAi({ s }: { s: Summary }) {
  const parts = SEGMENTS.map((seg) => ({ ...seg, n: s[seg.key] })).filter(
    (p) => p.n > 0,
  );
  return (
    <div className="col-span-2 flex flex-col gap-3 bg-surface px-4 py-4 sm:px-5 lg:col-span-1">
      <dt className="text-xs font-medium text-ink-muted">{copy.share.title}</dt>
      <dd className="flex flex-col gap-3">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="tabular font-mono text-3xl font-semibold tracking-tight text-ink">
            {copy.share.percent(s.agentPct)}
          </span>
          <span className="text-sm text-ink-muted">
            {copy.share.of(s.agent, s.total)}
          </span>
        </p>
        <div
          role="img"
          aria-label={copy.share.barLabel(s.agent, s.template, s.pending)}
          className="flex h-2.5 gap-0.5"
        >
          {parts.map((p) => (
            <span
              key={p.key}
              className={cn('h-full rounded-[4px]', p.fill)}
              style={{ width: `${(p.n / Math.max(1, s.total)) * PERCENT}%` }}
            />
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          {SEGMENTS.filter((seg) => seg.key !== 'pending' || s.pending > 0).map(
            (seg) => (
              <li key={seg.key} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full', seg.fill)}
                />
                {seg.label}
                <span className="tabular font-mono font-medium text-ink">
                  {s[seg.key]}
                </span>
              </li>
            ),
          )}
        </ul>
      </dd>
    </div>
  );
}

function Tile({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: number;
}) {
  return (
    <div className="flex flex-col bg-surface px-4 py-4">
      <dt className="text-xs font-medium text-ink-muted">{label}</dt>
      <dd className="mt-1 flex flex-1 flex-col">
        <span className="tabular font-mono text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
        <span className="mt-auto pt-1 text-micro leading-snug text-ink-subtle">
          {hint}
        </span>
      </dd>
    </div>
  );
}

/** At a glance: how much AI wrote, what the fact check caught, who wrote it. */
export function TraceSummary({ traces }: { traces: readonly InsightTrace[] }) {
  const s = summarise(traces);
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-panel lg:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_minmax(0,1.4fr)]">
      <ShareOfAi s={s} />
      <Tile
        label={copy.tiles.caught}
        hint={
          s.heldBack > 0
            ? `${copy.tiles.caughtHint}. ${copy.tiles.heldBack(s.heldBack)}`
            : copy.tiles.caughtHint
        }
        value={s.rejected}
      />
      <Tile
        label={copy.tiles.simulated}
        hint={copy.tiles.simulatedHint}
        value={s.simulated}
      />
      <div className="col-span-2 bg-surface px-4 py-4 lg:col-span-1">
        <dt className="text-xs font-medium text-ink-muted">
          {copy.tiles.providers}
        </dt>
        <dd className="mt-2 flex flex-wrap gap-1">
          {s.providers.map((p) => (
            <ProviderBadge key={p} provider={p} />
          ))}
        </dd>
      </div>
    </dl>
  );
}
