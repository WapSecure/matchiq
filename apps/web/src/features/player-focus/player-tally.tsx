import type { PlayerTally as Tally } from '@matchiq/football-engine/player';
import { PLAYER_FOCUS_COPY as C, TALLY_ITEMS } from '@/constants/player-focus';

/** Counts straight from the ledger; nothing here is estimated. */
export function PlayerTally({ tally, name }: { tally: Tally; name: string }) {
  return (
    <dl
      aria-label={C.countsLabel(name)}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {TALLY_ITEMS.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 flex-col gap-0.5 rounded-md border border-line bg-surface-sunken px-3 py-2"
        >
          <dt className="text-micro text-ink-subtle">{item.label}</dt>
          <dd className="tabular text-lg font-semibold leading-6 text-ink">
            {item.value(tally)}
          </dd>
          {item.detail ? (
            <dd className="truncate text-micro text-ink-muted">
              {item.detail(tally)}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
