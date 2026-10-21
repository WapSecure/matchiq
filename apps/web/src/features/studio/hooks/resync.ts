import type { QueryClient } from '@tanstack/react-query';
import { fetchMatchState } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import type { MatchStore } from '../store';

/** Fetches a fresh snapshot and applies it as authoritative (gap or seek recovery). */
export const resyncSnapshot = async (
  queryClient: QueryClient,
  store: MatchStore,
  fixtureId: string,
): Promise<void> => {
  const snapshot = await queryClient.fetchQuery({
    queryKey: queryKeys.state(fixtureId),
    queryFn: ({ signal }) => fetchMatchState(fixtureId, signal),
    staleTime: 0,
  });
  store.getState().applySnapshot(snapshot, true);
};
