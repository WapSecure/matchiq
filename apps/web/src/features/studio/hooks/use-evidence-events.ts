'use client';

import type { MatchEvent } from '@matchiq/contracts';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/lib/api/query-keys';
import { resolveEvents } from '../lib/resolve-events';
import { selectEventsById, useMatchStoreShallow } from '../store';

export type EvidenceEvents = {
  events: MatchEvent[];
  /** True while ids outside the loaded timeline are being looked up. */
  resolving: boolean;
};

/**
 * Triggering events for an insight: taken from the store's timeline when
 * loaded, otherwise resolved from the session ledger with bounded paging.
 */
export const useEvidenceEvents = (
  fixtureId: string,
  ids: readonly string[],
): EvidenceEvents => {
  const local = useMatchStoreShallow((s) => selectEventsById(s, ids));
  const missing = useMemo(() => {
    const have = new Set(local.map((e) => e.eventId));
    return ids.filter((id) => !have.has(id));
  }, [ids, local]);
  const remote = useQuery({
    queryKey: [...queryKeys.fixture(fixtureId), 'evidence', missing],
    queryFn: ({ signal }) => resolveEvents(fixtureId, missing, signal),
    enabled: missing.length > 0,
    staleTime: Infinity,
  });
  const events = useMemo(
    () => [...local, ...(missing.length > 0 ? (remote.data ?? []) : [])],
    [local, missing.length, remote.data],
  );
  return { events, resolving: missing.length > 0 && remote.isFetching };
};
