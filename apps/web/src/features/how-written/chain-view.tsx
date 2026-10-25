import { ShieldIcon } from '@/components/icons';
import { Badge } from '@/components/ui';
import { STEP_DECISION_TONES } from '@/constants/agent-steps';
import { MOMENT_TRACE_COPY } from '@/constants/moment-trace';
import type { ChainLink, MomentChain } from './moment-chain';

const copy = MOMENT_TRACE_COPY;

function Link({ item }: { item: ChainLink }) {
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md border border-line bg-surface px-2 py-1.5 text-xs">
      <span className="font-medium text-ink">{item.label}</span>
      <Badge tone={STEP_DECISION_TONES[item.tone]}>{item.outcome}</Badge>
      {item.duration ? (
        <span className="tabular text-micro text-ink-subtle">
          {copy.tookLabel(item.duration)}
        </span>
      ) : null}
    </li>
  );
}

function Caught({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={copy.caughtLabel} className="flex flex-col gap-0.5">
      <p className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
        <ShieldIcon size={13} className="text-warning" />
        {copy.caught(items.length)}
      </p>
      <ul className="flex list-disc flex-col gap-0.5 pl-8 text-xs text-ink-muted">
        {items.map((item, i) => (
          <li key={`${i}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

/** The chain for one moment: each stage with its outcome, then who wrote the wording. */
export function ChainView({
  chain,
  moment,
}: {
  chain: MomentChain;
  moment: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {chain.links.length > 0 ? (
        <ol
          aria-label={copy.chainLabel(moment)}
          className="grid gap-1.5 sm:grid-cols-2"
        >
          {chain.links.map((item) => (
            <Link key={item.key} item={item} />
          ))}
        </ol>
      ) : null}
      {chain.extras.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="font-medium text-ink">{copy.also}</span>
          {chain.extras.map((item) => (
            <span key={item.key}>
              {item.label}: {item.outcome}
              {item.duration ? ` · ${item.duration}` : ''}
            </span>
          ))}
        </p>
      ) : null}
      <Caught items={chain.caught} />
      {chain.finalLine ? (
        <p className="text-xs font-medium text-ink">{chain.finalLine}</p>
      ) : null}
      {chain.links.length === 0 && !chain.standardReason ? (
        <p className="text-xs text-ink-subtle">{copy.empty}</p>
      ) : null}
    </div>
  );
}
