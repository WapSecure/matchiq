'use client';

import type { StreamMessage } from '@matchiq/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_PATHS, STREAM_TIMING } from '@/constants/api';
import { fetchStreamTicket } from '@/lib/api/endpoints';
import { isSignedIn, whenSessionKnown } from '@/lib/auth/session-store';
import { publicApiUrl } from '@/lib/env';
import {
  fetchSseTransport,
  MatchStreamClient,
  type SseTransport,
  ticketedSseTransport,
} from '@/lib/stream';
import { useMatchStoreApi, useStudioUi } from '../store';
import { hydrateStudio } from './hydrate';

type MatchStreamOptions = {
  enabled?: boolean;
  /** Injected in tests; defaults to the fetch-based SSE transport. */
  transport?: SseTransport;
};

const STREAM_WARNING = '[matchiq] dropped invalid stream message:';

/** Signed in, each connection presents a short-lived ticket; signed out, none is needed. */
/** Decided per connection: a session can start or end while the studio is open. */
const streamTransport = (fixtureId: string): SseTransport => {
  const plain = fetchSseTransport();
  const ticketed = ticketedSseTransport(
    async () => (await fetchStreamTicket(fixtureId)).ticket,
    plain,
  );
  return async function* stream(request) {
    await whenSessionKnown();
    yield* isSignedIn() ? ticketed(request) : plain(request);
  };
};

/**
 * Connects the session stream to the match store. Messages are coalesced and
 * flushed on a short interval so a 30x replay costs one store update per tick.
 * Without a resume point the stream starts at the live head, so read models
 * are hydrated once it is accepted; a gap re-hydrates before held messages.
 */
export const useMatchStream = (
  fixtureId: string,
  { enabled = true, transport }: MatchStreamOptions = {},
): void => {
  const store = useMatchStoreApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;
    const queue: StreamMessage[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      store.getState().applyMessages(queue.splice(0));
    };

    const client = new MatchStreamClient({
      url: publicApiUrl(API_PATHS.stream(fixtureId)),
      fixtureId,
      transport: transport ?? streamTransport(fixtureId),
      onMessage: (message) => {
        queue.push(message);
        timer ??= setTimeout(flush, STREAM_TIMING.flushIntervalMs);
      },
      onOpen: ({ resumed }) => {
        if (!resumed) store.getState().requestHydration();
      },
      onStatus: (status) => store.getState().setConnection(status),
      onGap: () => {
        flush();
        const { persona, locale } = useStudioUi.getState();
        return hydrateStudio(
          { queryClient, store, fixtureId },
          { persona, locale },
        );
      },
      onInvalidMessage: (reason) => console.warn(STREAM_WARNING, reason),
    });
    client.start();
    return () => {
      client.stop();
      if (timer !== null) clearTimeout(timer);
    };
  }, [enabled, fixtureId, queryClient, store, transport]);
};
