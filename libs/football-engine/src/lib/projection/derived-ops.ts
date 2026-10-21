import type { MatchEvent } from '@matchiq/contracts';
import type {
  DerivedState,
  FixtureContext,
  Side,
  TeamTally,
  TrackedKind,
} from '../types.js';

export type Handler<E extends MatchEvent = MatchEvent> = (
  derived: DerivedState,
  event: E,
  context: FixtureContext,
) => DerivedState;

type CountKey = keyof TeamTally;

export const bump = (
  derived: DerivedState,
  side: Side,
  keys: readonly CountKey[],
): DerivedState => {
  const tally = { ...derived.tallies[side] };
  for (const key of keys) tally[key] += 1;
  return { ...derived, tallies: { ...derived.tallies, [side]: tally } };
};

export const track = (
  derived: DerivedState,
  side: Side,
  kinds: readonly TrackedKind[],
  event: MatchEvent,
): DerivedState => {
  const entry = {
    eventId: event.eventId,
    sequence: event.sequence,
    period: event.period,
    clockMs: event.matchClockMs,
  };
  const timeline = { ...derived.timelines[side] };
  for (const kind of kinds) timeline[kind] = [...timeline[kind], entry];
  return { ...derived, timelines: { ...derived.timelines, [side]: timeline } };
};

/** Counts the event in each tally key and on the matching timelines. */
export const countAndTrack = (
  derived: DerivedState,
  side: Side,
  kinds: readonly TrackedKind[],
  event: MatchEvent,
): DerivedState => track(bump(derived, side, kinds), side, kinds, event);
