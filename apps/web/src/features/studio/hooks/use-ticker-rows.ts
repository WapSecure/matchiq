'use client';

import type { MatchEvent } from '@matchiq/contracts';
import { useMemo, useRef } from 'react';
import type { TickerRow } from '@/components/match/event-ticker';
import { HIGHLIGHT_EVENT_TYPES, KEY_EVENT_TYPES } from '@/constants/match';
import { formatMinute } from '@/lib/format';
import { describeEvent } from '../lib/describe-event';
import type { Roster } from '../lib/roster';

const toRow = (
  event: MatchEvent,
  roster: Roster,
  voided: string | null,
): TickerRow => {
  const described = describeEvent(event, roster);
  return {
    id: event.eventId,
    minute: formatMinute(event.period, event.matchClockMs),
    label: described.label,
    detail: described.detail,
    team: roster.team(described.teamId),
    highlight: HIGHLIGHT_EVENT_TYPES.has(event.type),
    voided,
  };
};

/**
 * Newest-first key events. Row objects are cached per event so memoised
 * ticker items skip re-rendering when the timeline grows.
 */
export const useTickerRows = (
  timeline: readonly MatchEvent[],
  voided: Record<string, string>,
  roster: Roster,
): TickerRow[] => {
  const cache = useRef(new WeakMap<MatchEvent, TickerRow>());
  const cachedRoster = useRef(roster);
  if (cachedRoster.current !== roster) {
    cache.current = new WeakMap();
    cachedRoster.current = roster;
  }
  return useMemo(() => {
    const rows: TickerRow[] = [];
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const event = timeline[i];
      if (!event || !KEY_EVENT_TYPES.has(event.type)) continue;
      const reason = voided[event.eventId] ?? null;
      let row = cache.current.get(event);
      if (!row || row.voided !== reason) {
        row = toRow(event, roster, reason);
        cache.current.set(event, row);
      }
      rows.push(row);
    }
    return rows;
  }, [timeline, voided, roster]);
};
