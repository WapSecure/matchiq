import type {
  MatchEvent,
  MatchEventOf,
  MatchEventType,
} from '@matchiq/contracts';
import { HIGH_RECOVERY_MIN_X } from '../constants.js';
import type { DerivedState, TrackedKind } from '../types.js';
import { bump, countAndTrack, type Handler } from './derived-ops.js';
import { opponentOf, sideOf } from './initial-state.js';
import { changePossession, closeSegment } from './possession.js';

type HandlerMap = { readonly [T in MatchEventType]?: Handler<MatchEventOf<T>> };

const shot: Handler<MatchEventOf<'SHOT'>> = (derived, event, context) => {
  const side = sideOf(context, event.teamId);
  if (side === null) return derived;
  const kinds: TrackedKind[] =
    event.outcome === 'ON_TARGET' ? ['shots', 'shotsOnTarget'] : ['shots'];
  return countAndTrack(derived, side, kinds, event);
};

/** The GOAL's `teamId` is the scorer's team; an own goal credits the opponent. */
const goal: Handler<MatchEventOf<'GOAL'>> = (derived, event, context) => {
  const side = sideOf(context, event.teamId);
  if (side === null) return derived;
  return bump(derived, event.ownGoal ? opponentOf(side) : side, ['goals']);
};

const passAttempted: Handler<MatchEventOf<'PASS_ATTEMPTED'>> = (
  derived,
  event,
  context,
) => {
  const side = sideOf(context, event.teamId);
  if (side === null) return derived;
  const passAttempts = new Map(derived.passAttempts).set(event.eventId, side);
  return { ...bump(derived, side, ['passesAttempted']), passAttempts };
};

/** Spec §43: a completion counts once, and only against a known attempt by the same team. */
const passCompleted: Handler<MatchEventOf<'PASS_COMPLETED'>> = (
  derived,
  event,
  context,
) => {
  const side = sideOf(context, event.teamId);
  const attemptSide = derived.passAttempts.get(event.attemptEventId);
  if (side === null || attemptSide !== side) return derived;
  if (derived.completedAttempts.has(event.attemptEventId)) return derived;
  const completedAttempts = new Set(derived.completedAttempts).add(
    event.attemptEventId,
  );
  return { ...bump(derived, side, ['passesCompleted']), completedAttempts };
};

const tracked =
  (kinds: readonly TrackedKind[]): Handler =>
  (derived, event, context) => {
    const side = 'teamId' in event ? sideOf(context, event.teamId) : null;
    return side === null ? derived : countAndTrack(derived, side, kinds, event);
  };

const recovery: Handler<MatchEventOf<'RECOVERY'>> = (derived, event, context) =>
  tracked(
    event.location.x >= HIGH_RECOVERY_MIN_X
      ? ['recoveries', 'highRecoveries']
      : ['recoveries'],
  )(derived, event, context);

const foul: Handler<MatchEventOf<'FOUL'>> = (derived, event, context) => {
  const side = sideOf(context, event.teamId);
  return side === null ? derived : bump(derived, side, ['fouls']);
};

/**
 * YELLOW counts one caution. SECOND_YELLOW counts a caution and a dismissal,
 * because the player is shown a second yellow and then the red. RED counts a dismissal.
 */
const card: Handler<MatchEventOf<'CARD'>> = (derived, event, context) => {
  const side = sideOf(context, event.teamId);
  if (side === null) return derived;
  if (event.card === 'YELLOW') return bump(derived, side, ['yellowCards']);
  if (event.card === 'RED') return bump(derived, side, ['redCards']);
  return bump(derived, side, ['yellowCards', 'redCards']);
};

const possessionChanged: Handler<MatchEventOf<'POSSESSION_CHANGED'>> = (
  derived,
  event,
  context,
) => {
  const owner = sideOf(context, event.teamId);
  if (event.teamId !== null && owner === null) return derived;
  return {
    ...derived,
    possession: changePossession(
      derived.possession,
      owner,
      event.period,
      event.matchClockMs,
    ),
  };
};

const closePossession = (
  derived: DerivedState,
  event: MatchEvent,
): DerivedState => ({
  ...derived,
  possession: closeSegment(
    derived.possession,
    event.period,
    event.matchClockMs,
  ),
});

export const HANDLERS: HandlerMap = {
  MATCH_STARTED: (derived) => ({ ...derived, phase: 'IN_PLAY' }),
  PERIOD_STARTED: (derived, event) => ({
    ...closePossession(derived, event),
    phase: 'IN_PLAY',
    periodStartClockMs: event.matchClockMs,
  }),
  PERIOD_ENDED: (derived, event) => ({
    ...closePossession(derived, event),
    phase: 'BREAK',
  }),
  MATCH_ENDED: (derived, event) => ({
    ...closePossession(derived, event),
    phase: 'COMPLETED',
  }),
  SHOT: shot,
  GOAL: goal,
  PASS_ATTEMPTED: passAttempted,
  PASS_COMPLETED: passCompleted,
  PRESSURE_APPLIED: tracked(['pressures']),
  RECOVERY: recovery,
  FINAL_THIRD_ENTRY: tracked(['finalThirdEntries']),
  FOUL: foul,
  CARD: card,
  POSSESSION_CHANGED: possessionChanged,
};
