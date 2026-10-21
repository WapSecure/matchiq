'use client';

import type { StreamMessage } from '@matchiq/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_PATHS, STREAM_TIMING } from '@/constants/api';
import { apiUrl } from '@/lib/env';
import { MatchStreamClient, type SseTransport } from '@/lib/stream';
import { useMatchStoreApi, useStudioUi } from '../store';
import { hydrateStudio } from './hydrate';

type MatchStreamOptions = {
  enabled?: boolean;
  /** Injected in tests; defaults to the fetch-based SSE transport. */
  transport?: SseTransport;
};

const STREAM_WARNING = '[matchiq] dropped invalid stream message:';

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
      url: apiUrl(API_PATHS.stream(fixtureId)),
      fixtureId,
      transport,
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
