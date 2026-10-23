'use client';

import type { MatchEvent } from '@matchiq/contracts';
import { useMemo } from 'react';
import type { TickerRow } from '@/components/match/event-ticker';
import { usePreferences } from '@/features/preferences/preferences-store';

const actorOf = (event: MatchEvent): string | null =>
  'playerId' in event && typeof event.playerId === 'string'
    ? event.playerId
    : null;

/**
 * Marks timeline rows whose event the followed player made. Only those rows
 * get new objects, so the memoised ticker re-renders nothing else.
 */
export const useFollowedRows = (
  rows: readonly TickerRow[],
  events: readonly MatchEvent[],
  inSquad: (playerId: string) => boolean,
): readonly TickerRow[] => {
  const followed = usePreferences((s) => s.followedPlayerIds);
  const focus = followed.find(inSquad) ?? null;
  const ids = useMemo(() => {
    const own = new Set<string>();
    if (focus === null) return own;
    for (const event of events) {
      if (actorOf(event) === focus) own.add(event.eventId);
    }
    return own;
  }, [events, focus]);
  return useMemo(
    () =>
      ids.size === 0
        ? rows
        : rows.map((row) =>
            ids.has(row.id) ? { ...row, followed: true } : row,
          ),
    [rows, ids],
  );
};
