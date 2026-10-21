'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_LIMITS } from '@/constants/api';
import { useFixtureEvents, useMatchState } from '@/lib/api/hooks';
import { useMatchStore, useMatchStoreApi } from '../store';
import { resyncSnapshot } from './resync';

const NO_SNAPSHOT = -1;

/**
 * Seeds the store from REST: the snapshot first, then the tail of the event
 * log behind it. A store `resyncToken` bump (seek or gap) refetches both.
 */
export const useStudioBootstrap = (fixtureId: string) => {
  const store = useMatchStoreApi();
  const queryClient = useQueryClient();
  const state = useMatchState(fixtureId);
  const resyncToken = useMatchStore((s) => s.resyncToken);
  const through = state.data?.throughSequence ?? NO_SNAPSHOT;
  const events = useFixtureEvents(
    fixtureId,
    {
      afterSequence: Math.max(NO_SNAPSHOT, through - API_LIMITS.eventsPageSize),
    },
    { enabled: state.isSuccess },
  );

  useEffect(() => {
    if (state.data) store.getState().applySnapshot(state.data, true);
  }, [state.data, store]);

  useEffect(() => {
    if (events.data) store.getState().applyEvents(events.data.items);
  }, [events.data, store]);

  useEffect(() => {
    if (resyncToken > 0) {
      resyncSnapshot(queryClient, store, fixtureId).catch(() => undefined);
    }
  }, [fixtureId, queryClient, resyncToken, store]);

  return { state, events };
};
