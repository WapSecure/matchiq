import type { Locale, Persona } from '@matchiq/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { API_LIMITS } from '@/constants/api';
import {
  fetchFixtureEvents,
  fetchInsights,
  fetchMatchState,
  fetchNarratives,
  fetchOverlays,
  fetchReplayStatus,
} from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import type { MatchStore } from '../store';

const NO_SNAPSHOT = -1;

type Ctx = { queryClient: QueryClient; store: MatchStore; fixtureId: string };

const fresh = <T>(
  { queryClient }: Ctx,
  queryKey: readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<T>,
) =>
  queryClient.fetchQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    staleTime: 0,
    retry: false,
  });

/** Snapshot first, then the tail of the event log behind it. */
const hydrateMatch = async (ctx: Ctx): Promise<void> => {
  const { store, fixtureId } = ctx;
  const snapshot = await fresh(ctx, queryKeys.state(fixtureId), (s) =>
    fetchMatchState(fixtureId, s),
  ).catch(() => null);
  if (snapshot) store.getState().applySnapshot(snapshot, true);
  const through = snapshot?.throughSequence ?? NO_SNAPSHOT;
  const query = {
    afterSequence: Math.max(NO_SNAPSHOT, through - API_LIMITS.eventsPageSize),
  };
  const page = await fresh(ctx, queryKeys.events(fixtureId, query), (s) =>
    fetchFixtureEvents(fixtureId, query, s),
  );
  store.getState().applyEvents(page.items);
};

export const hydrateNarratives = async (
  ctx: Ctx,
  persona: Persona,
  locale: Locale,
): Promise<void> => {
  const { store, fixtureId } = ctx;
  const narratives = await fresh(
    ctx,
    queryKeys.narratives(fixtureId, { persona, locale }),
    (s) => fetchNarratives(fixtureId, { persona, locale }, s),
  );
  store.getState().applyHydration({ narratives });
};

/**
 * Loads every read model a viewer joining mid-match needs. Runs after the
 * stream is accepted so nothing committed before the stream's head is missed;
 * the store dedupes anything delivered by both.
 */
export const hydrateStudio = async (
  ctx: Ctx,
  audience: { persona: Persona; locale: Locale },
): Promise<void> => {
  const { store, fixtureId } = ctx;
  await Promise.allSettled([
    hydrateMatch(ctx),
    fresh(ctx, queryKeys.replay(fixtureId), (s) =>
      fetchReplayStatus(fixtureId, s),
    ).then((status) => store.getState().applyReplayStatus(status, 'rest')),
    fresh(ctx, queryKeys.insights(fixtureId), (s) =>
      fetchInsights(fixtureId, s),
    ).then((insights) => store.getState().applyHydration({ insights })),
    fresh(ctx, queryKeys.overlays(fixtureId), (s) =>
      fetchOverlays(fixtureId, s),
    ).then((overlays) => store.getState().applyHydration({ overlays })),
    hydrateNarratives(ctx, audience.persona, audience.locale),
  ]);
  store.getState().markHydrated();
};
