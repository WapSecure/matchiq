'use client';

import type { PlayerAction } from '@matchiq/football-engine/player';
import { useMemo, useState } from 'react';
import { LoadMore } from '@/components/ui/pagination';
import {
  ACTION_LABELS,
  PLAYER_FOCUS_COPY as C,
  PLAYER_FOCUS_LIMITS,
} from '@/constants/player-focus';
import { cn } from '@/lib/cn';
import { formatMinute } from '@/lib/format';

const STRONG = new Set<PlayerAction['kind']>(['goal', 'card']);

/** Newest first; a page at a time so a busy player never floods the panel. */
export function PlayerTimeline({
  actions,
}: {
  actions: readonly PlayerAction[];
}) {
  const [limit, setLimit] = useState<number>(PLAYER_FOCUS_LIMITS.timelinePage);
  const newest = useMemo(() => [...actions].reverse(), [actions]);
  const shown = newest.slice(0, limit);
  return (
    <section aria-label={C.timelineTitle} className="flex flex-col gap-1.5">
      <h3 className="eyebrow text-ink-subtle">{C.timelineTitle}</h3>
      <ol className="flex flex-col divide-y divide-line rounded-md border border-line">
        {shown.map((a) => (
          <li
            key={a.eventId}
            data-action={a.kind}
            className={cn(
              'grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2 px-3 py-1.5 text-xs',
              STRONG.has(a.kind) && 'bg-accent-soft',
            )}
          >
            <span className="tabular text-right font-mono text-ink-muted">
              {formatMinute(a.period, a.clockMs)}
            </span>
            <span className="font-medium text-ink">
              {ACTION_LABELS[a.kind]}
            </span>
          </li>
        ))}
      </ol>
      {newest.length > PLAYER_FOCUS_LIMITS.timelinePage ? (
        <LoadMore
          shown={shown.length}
          total={newest.length}
          hasMore={limit < newest.length}
          onLoadMore={() =>
            setLimit((n) => n + PLAYER_FOCUS_LIMITS.timelinePage)
          }
          noun={C.timelineNoun}
          label={C.timelineMore}
        />
      ) : null}
    </section>
  );
}
