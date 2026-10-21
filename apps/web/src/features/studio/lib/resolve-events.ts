import type { MatchEvent } from '@matchiq/contracts';
import { API_LIMITS } from '@/constants/api';
import { fetchFixtureEvents } from '@/lib/api/endpoints';

const BEFORE_FIRST = -1;

/**
 * Finds events by id in the session ledger, walking pages from kick-off and
 * stopping once every id is found, the ledger ends or the page budget is spent
 * (a full synthetic match is about three pages).
 */
export const resolveEvents = async (
  fixtureId: string,
  ids: readonly string[],
  signal?: AbortSignal,
  maxPages: number = API_LIMITS.evidencePagesMax,
): Promise<MatchEvent[]> => {
  const wanted = new Set(ids);
  const found: MatchEvent[] = [];
  let after = BEFORE_FIRST;
  for (let page = 0; page < maxPages && wanted.size > 0; page += 1) {
    const { items } = await fetchFixtureEvents(
      fixtureId,
      { afterSequence: after, limit: API_LIMITS.eventsPageMax },
      signal,
    );
    for (const event of items) {
      if (wanted.delete(event.eventId)) found.push(event);
    }
    const last = items.at(-1);
    if (!last || items.length < API_LIMITS.eventsPageMax) break;
    after = last.sequence;
  }
  return found;
};
