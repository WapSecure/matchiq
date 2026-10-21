import type { MatchEvent, Player } from '@matchiq/contracts';
import {
  DURATION,
  MODIFIERS,
  MOVEMENT,
  PITCH,
  PROBABILITY,
} from '../constants.js';
import type { Rng } from '../prng.js';
import {
  type Point,
  clampPoint,
  distance,
  entersFinalThird,
  mirror,
  toPitchPoint,
} from './geometry.js';
import {
  type EffectiveProfile,
  type MatchState,
  currentCarrier,
  effectiveProfile,
  opponentOf,
  possessingSide,
  sampleRange,
  teamIdOf,
} from './match-state.js';
import { changePossession, contestLooseBall, stopPlay } from './possession.js';

export type PassOutcome = 'complete' | 'intercepted' | 'loose' | 'out';

const passTarget = (
  rng: Rng,
  from: Point,
  profile: EffectiveProfile,
  forced: boolean,
): Point => {
  const forward = forced
    ? rng.range(MODIFIERS.forcedPassForwardMin, MODIFIERS.forcedPassForwardMax)
    : rng.range(
        -MOVEMENT.passBackMax,
        MOVEMENT.passForwardBase +
          MOVEMENT.passForwardDirectness * profile.directness,
      );
  const lateral = rng.range(-MOVEMENT.passLateralMax, MOVEMENT.passLateralMax);
  return clampPoint({ x: from.x + forward, y: from.y + lateral });
};

const successProbability = (
  state: MatchState,
  profile: EffectiveProfile,
  from: Point,
  to: Point,
): number => {
  const p =
    PROBABILITY.passSuccessBase +
    PROBABILITY.passStrengthWeight *
      (profile.strength - PROBABILITY.passStrengthPivot) -
    (state.underPressure ? PROBABILITY.passPressurePenalty : 0) -
    distance(from, to) * PROBABILITY.passDistancePenaltyPerUnit -
    (to.x >= PITCH.finalThirdX ? PROBABILITY.passFinalThirdPenalty : 0) -
    (profile.fatigued ? PROBABILITY.passFatiguePenalty : 0);
  return Math.min(
    PROBABILITY.passSuccessMax,
    Math.max(PROBABILITY.passSuccessMin, p),
  );
};

const rollOutcome = (rng: Rng, success: number): PassOutcome => {
  if (rng.chance(success)) return 'complete';
  const failure = rng.next();
  if (failure < PROBABILITY.failureIntercepted) return 'intercepted';
  return failure < PROBABILITY.failureIntercepted + PROBABILITY.failureLoose
    ? 'loose'
    : 'out';
};

interface PassPlay {
  readonly attempt: MatchEvent;
  readonly passer: Player;
  readonly receiver: Player;
  readonly target: Point;
}

const completePass = (state: MatchState, play: PassPlay): void => {
  const { attempt, passer, receiver, target } = play;
  const side = possessingSide(state);
  state.sink.emit({
    type: 'PASS_COMPLETED',
    teamId: teamIdOf(state, side),
    playerId: receiver.playerId,
    attemptEventId: attempt.eventId,
    location: toPitchPoint(target),
  });
  if (entersFinalThird(state.ball, target)) {
    state.sink.emit({
      type: 'FINAL_THIRD_ENTRY',
      teamId: teamIdOf(state, side),
      playerId: receiver.playerId,
      location: toPitchPoint(target),
    });
  }
  state.carrier = receiver;
  state.ball = target;
  state.underPressure = false;
  state.lastPass = { passerId: passer.playerId, receiverId: receiver.playerId };
  const tempo = effectiveProfile(state, side).tempo;
  state.clock.advance(sampleRange(state.rng, DURATION.holdMs) / tempo);
};

const interceptPass = (state: MatchState, play: PassPlay): void => {
  const { attempt, target } = play;
  const defender = opponentOf(possessingSide(state));
  const location = mirror(target);
  const interceptor = state.rosters[defender].pickByZone(
    state.rng,
    location.x,
    {
      outfieldOnly: true,
    },
  );
  state.sink.emit({
    type: 'PASS_INTERCEPTED',
    teamId: teamIdOf(state, defender),
    playerId: interceptor.playerId,
    attemptEventId: attempt.eventId,
    location: toPitchPoint(location),
  });
  changePossession(state, defender, interceptor, location);
};

/** `force` lets scripted beats dictate the outcome without changing how the pass is recorded. */
export const attemptPass = (state: MatchState, force?: PassOutcome): void => {
  const side = possessingSide(state);
  const passer = currentCarrier(state);
  const profile = effectiveProfile(state, side);
  const target = passTarget(
    state.rng,
    state.ball,
    profile,
    force === 'complete',
  );
  const receiver = state.rosters[side].pickByZone(state.rng, target.x, {
    exclude: passer.playerId,
  });
  const attempt = state.sink.emit({
    type: 'PASS_ATTEMPTED',
    teamId: teamIdOf(state, side),
    playerId: passer.playerId,
    location: toPitchPoint(state.ball),
    targetLocation: toPitchPoint(target),
    intendedReceiverId: receiver.playerId,
    underPressure: state.underPressure,
  });
  state.clock.advance(
    DURATION.passBaseMs + distance(state.ball, target) * DURATION.passMsPerUnit,
  );
  const outcome =
    force ??
    rollOutcome(
      state.rng,
      successProbability(state, profile, state.ball, target),
    );
  const play: PassPlay = { attempt, passer, receiver, target };
  if (outcome === 'complete') {
    completePass(state, play);
  } else if (outcome === 'intercepted') {
    interceptPass(state, play);
  } else if (outcome === 'loose') {
    contestLooseBall(state, target, PROBABILITY.looseRecoveredByAttacker);
  } else {
    const restartSide = opponentOf(side);
    stopPlay(state, {
      side: restartSide,
      point: mirror(target),
      gapMs: DURATION.outOfPlayMs,
    });
  }
};
