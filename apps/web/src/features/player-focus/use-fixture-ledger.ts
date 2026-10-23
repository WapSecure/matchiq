'use client';

import type { MatchEvent } from '@matchiq/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { API_LIMITS } from '@/constants/api';
import { PLAYER_FOCUS_LIMITS } from '@/constants/player-focus';
import { fetchFixtureEvents } from '@/lib/api/endpoints';

const BEFORE_FIRST = -1;

type Kept = {
  fixtureId: string;
  bySequence: Map<number, MatchEvent>;
  /** Every sequence up to here has been fetched from the ledger. */
  fetchedThrough: number;
};

export type LedgerStatus = 'loading' | 'ready' | 'error';

const fetchAfter = async (kept: Kept, signal: AbortSignal): Promise<void> => {
  let after = kept.fetchedThrough;
  for (let page = 0; page < PLAYER_FOCUS_LIMITS.ledgerPagesMax; page += 1) {
    const result = await fetchFixtureEvents(
      kept.fixtureId,
      { afterSequence: after, limit: API_LIMITS.eventsPageMax },
      signal,
    );
    for (const event of result.items)
      kept.bySequence.set(event.sequence, event);
    after = result.items.at(-1)?.sequence ?? after;
    kept.fetchedThrough = after;
    if (result.nextAfterSequence === null) return;
  }
};

/**
 * The whole match ledger for counting: every event so far from the API,
 * then live events as they arrive. The studio's live window is bounded, so
 * on its own it would under-count a long match; if the window ever jumps
 * past what was fetched, the missing stretch is fetched again.
 */
export const useFixtureLedger = (
  fixtureId: string,
  live: readonly MatchEvent[] = [],
) => {
  const kept = useRef<Kept>({
    fixtureId,
    bySequence: new Map(),
    fetchedThrough: BEFORE_FIRST,
  });
  if (kept.current.fixtureId !== fixtureId) {
    kept.current = {
      fixtureId,
      bySequence: new Map(),
      fetchedThrough: BEFORE_FIRST,
    };
  }
  const [status, setStatus] = useState<LedgerStatus>('loading');
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchAfter(kept.current, controller.signal)
      .then(() => {
        setStatus('ready');
        setVersion((v) => v + 1);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e);
        setStatus('error');
      });
    return () => controller.abort();
  }, [fixtureId, attempt]);

  const events = useMemo(() => {
    const map = kept.current.bySequence;
    for (const event of live) map.set(event.sequence, event);
    return [...map.values()].sort((a, b) => a.sequence - b.sequence);
    // `version` re-sorts after a fetched page lands.
  }, [live, version]);

  const firstLive = live[0]?.sequence;
  const gap =
    status === 'ready' &&
    firstLive !== undefined &&
    firstLive > kept.current.fetchedThrough + 1 &&
    !kept.current.bySequence.has(firstLive - 1);
  useEffect(() => {
    if (gap) setAttempt((n) => n + 1);
  }, [gap]);

  return {
    events,
    status,
    error,
    retry: () => {
      setStatus('loading');
      setAttempt((n) => n + 1);
    },
  };
};
