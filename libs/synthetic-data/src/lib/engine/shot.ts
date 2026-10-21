import type { MatchEvent, Player, ShotOutcome } from '@matchiq/contracts';
import {
  DURATION,
  PITCH,
  PROBABILITY,
  SHOT_OUTCOME_WEIGHTS,
  SHOT_SPEED_KPH,
} from '../constants.js';
import { CENTRE_SPOT, toPitchPoint } from './geometry.js';
import {
  type MatchState,
  currentCarrier,
  effectiveProfile,
  opponentOf,
  possessingSide,
  sampleRange,
  teamIdOf,
} from './match-state.js';
import { changePossession, contestLooseBall, stopPlay } from './possession.js';

type BodyPart = Extract<MatchEvent, { type: 'SHOT' }>['bodyPart'];

const bodyPart = (state: MatchState): BodyPart => {
  if (
    state.ball.x >= PITCH.boxX &&
    state.rng.chance(PROBABILITY.headerShareInBox)
  ) {
    return 'HEAD';
  }
  return state.rng.chance(PROBABILITY.leftFootShare)
    ? 'LEFT_FOOT'
    : 'RIGHT_FOOT';
};

const keeperOrDefender = (state: MatchState): Player => {
  const defender = opponentOf(possessingSide(state));
  return (
    state.rosters[defender].keeper() ??
    state.rosters[defender].pickByZone(state.rng, PITCH.keeperX)
  );
};

const scoreGoal = (
  state: MatchState,
  shot: MatchEvent,
  shooter: Player,
): void => {
  const side = possessingSide(state);
  const assist =
    state.lastPass?.receiverId === shooter.playerId ? state.lastPass : null;
  state.sink.emit({
    type: 'GOAL',
    teamId: teamIdOf(state, side),
    playerId: shooter.playerId,
    shotEventId: shot.eventId,
    ...(assist === null ? {} : { assistPlayerId: assist.passerId }),
    ownGoal: false,
  });
  state.score[side] += 1;
  stopPlay(state, {
    side: opponentOf(side),
    point: CENTRE_SPOT,
    gapMs: DURATION.goalRestartMs,
    taker: (s) =>
      s.rosters[opponentOf(side)].pickByZone(s.rng, CENTRE_SPOT.x, {
        outfieldOnly: true,
      }),
  });
};

const saveShot = (state: MatchState, shot: MatchEvent): void => {
  const defender = opponentOf(possessingSide(state));
  const keeper = keeperOrDefender(state);
  state.sink.emit({
    type: 'SAVE',
    teamId: teamIdOf(state, defender),
    playerId: keeper.playerId,
    shotEventId: shot.eventId,
  });
  state.clock.advance(sampleRange(state.rng, DURATION.saveToDistributionMs));
  changePossession(state, defender, keeper, {
    x: PITCH.keeperX,
    y: CENTRE_SPOT.y,
  });
};

const converts = (state: MatchState, forcedGoal: boolean): boolean => {
  if (forcedGoal) return true;
  if (!state.preset.naturalGoals) return false;
  const profile = effectiveProfile(state, possessingSide(state));
  return state.rng.chance(
    PROBABILITY.conversionBase +
      PROBABILITY.conversionStrengthWeight * profile.strength,
  );
};

export const takeShot = (state: MatchState, forcedGoal: boolean): void => {
  const side = possessingSide(state);
  const shooter = currentCarrier(state);
  const outcome: ShotOutcome = forcedGoal
    ? 'ON_TARGET'
    : state.rng.weighted(SHOT_OUTCOME_WEIGHTS);
  const shot = state.sink.emit({
    type: 'SHOT',
    teamId: teamIdOf(state, side),
    playerId: shooter.playerId,
    location: toPitchPoint(state.ball),
    outcome,
    bodyPart: bodyPart(state),
    ...(state.preset.shotSpeedAvailable
      ? {
          speedKph: Math.round(
            state.rng.range(SHOT_SPEED_KPH.min, SHOT_SPEED_KPH.max),
          ),
        }
      : {}),
  });
  state.clock.advance(sampleRange(state.rng, DURATION.shotToOutcomeMs));
  if (outcome === 'ON_TARGET') {
    if (converts(state, forcedGoal)) scoreGoal(state, shot, shooter);
    else saveShot(state, shot);
  } else if (outcome === 'BLOCKED') {
    contestLooseBall(state, state.ball, PROBABILITY.blockedRecoveredByAttacker);
  } else {
    stopPlay(state, {
      side: opponentOf(side),
      point: { x: PITCH.goalKickX, y: CENTRE_SPOT.y },
      gapMs: DURATION.outOfPlayMs,
      taker: (s) => s.rosters[opponentOf(side)].keeper(),
    });
  }
};
