'use client';

import type { MatchEvent } from '@matchiq/contracts';
import { useCallback, useMemo, useRef, useState } from 'react';
import { API_LIMITS } from '@/constants/api';
import { KEY_EVENT_TYPES } from '@/constants/match';
import { fetchFixtureEvents } from '@/lib/api/endpoints';
import { useMatchStore } from '../store';

const BEFORE_FIRST = -1;

type Kept = {
  fixtureId: string;
  bySequence: Map<number, MatchEvent>;
  /** Lowest sequence already fetched, even when that page held no human events. */
  floor: number | null;
};

/**
 * The timeline the panel shows: every human event the store has delivered,
 * kept while the panel is open even after the store's bounded window slides
 * past it, plus older pages fetched on request. Older pages close the gap
 * below the earliest known sequence, so the list never has holes.
 */
export const useTimelineEvents = (fixtureId: string) => {
  const live = useMatchStore((s) => s.timeline);
  const kept = useRef<Kept>({ fixtureId, bySequence: new Map(), floor: null });
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (kept.current.fixtureId !== fixtureId) {
    kept.current = { fixtureId, bySequence: new Map(), floor: null };
  }

  const events = useMemo(() => {
    const map = kept.current.bySequence;
    for (const event of live) map.set(event.sequence, event);
    return [...map.values()].sort((a, b) => a.sequence - b.sequence);
    // `version` is a dependency only so the list re-sorts after an older page lands.
  }, [live, version]);

  const first = events[0]?.sequence ?? null;
  const floor = kept.current.floor;
  const earliest =
    first === null ? floor : floor === null ? first : Math.min(first, floor);
  const hasOlder = earliest !== null && earliest > 0;

  const loadOlder = useCallback(async () => {
    if (earliest === null || earliest <= 0 || loading) return;
    const after = Math.max(
      BEFORE_FIRST,
      earliest - API_LIMITS.eventsPageSize - 1,
    );
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFixtureEvents(fixtureId, {
        afterSequence: after,
        limit: earliest - after - 1,
      });
      const map = kept.current.bySequence;
      for (const event of page.items) {
        if (event.sequence < earliest && KEY_EVENT_TYPES.has(event.type))
          map.set(event.sequence, event);
      }
      kept.current.floor = after + 1;
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [earliest, fixtureId, loading]);

  return { events, hasOlder, loadOlder, loading, error };
};
