import type { MatchEvent } from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import { cumulativeMs } from '@/lib/format';
import type { MatchData } from './types';

/** High-frequency tracking samples feed metrics, not the human timeline. */
const TRACKING_TYPES = new Set<MatchEvent['type']>([
  'PLAYER_POSITION',
  'BALL_POSITION',
]);

const trim = (events: MatchEvent[]): MatchEvent[] =>
  events.length > STORE_LIMITS.timelineMax
    ? events.slice(events.length - STORE_LIMITS.timelineMax)
    : events;

const voidsOf = (events: readonly MatchEvent[]): Record<string, string> => {
  const voids: Record<string, string> = {};
  for (const event of events) {
    if (event.type === 'CORRECTION')
      voids[event.correctedEventId] = event.reason;
  }
  return voids;
};

/**
 * Merges events idempotently: duplicates (by sequence) are no-ops, order is
 * always by `sequence`, and the window is bounded to keep 30x replay cheap.
 */
export const reduceEvents = (
  state: MatchData,
  incoming: readonly MatchEvent[],
): Partial<MatchData> => {
  const known = new Set(state.timeline.map((e) => e.sequence));
  const fresh = incoming.filter(
    (e) => !known.has(e.sequence) && e.sequence > state.lastEventSequence,
  );
  const backfill = incoming.filter(
    (e) => !known.has(e.sequence) && e.sequence <= state.lastEventSequence,
  );
  if (fresh.length === 0 && backfill.length === 0) return {};
  const visible = [...fresh, ...backfill].filter(
    (e) => !TRACKING_TYPES.has(e.type),
  );
  const timeline = trim(
    [...state.timeline, ...visible].sort((a, b) => a.sequence - b.sequence),
  );
  const latest = fresh.reduce<MatchEvent | null>(
    (max, e) => (max === null || e.sequence > max.sequence ? e : max),
    null,
  );
  const advancesClock =
    latest !== null &&
    cumulativeMs(latest.period, latest.matchClockMs) >=
      cumulativeMs(state.clock.period, state.clock.ms);
  return {
    timeline,
    voided: { ...state.voided, ...voidsOf(visible) },
    ...(latest ? { lastEventSequence: latest.sequence } : {}),
    ...(latest && advancesClock
      ? { clock: { period: latest.period, ms: latest.matchClockMs } }
      : {}),
  };
};
