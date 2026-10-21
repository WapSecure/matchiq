import type { Player } from '@matchiq/contracts';
import { DURATION } from '../constants.js';
import type { Side } from '../types.js';
import { CENTRE_SPOT, type Point, mirror, toPitchPoint } from './geometry.js';
import {
  type MatchState,
  effectiveProfile,
  opponentOf,
  possessingSide,
  sampleRange,
  teamIdOf,
} from './match-state.js';
import { runDueSubstitutions } from './substitutions.js';

/** Emits the single authoritative transition; repeated control by the same side emits nothing. */
export const changePossession = (
  state: MatchState,
  side: Side | null,
  carrier: Player | null,
  point: Point,
): void => {
  if (side !== state.possession) {
    state.sink.emit({
      type: 'POSSESSION_CHANGED',
      teamId: side === null ? null : teamIdOf(state, side),
      ...(carrier === null ? {} : { playerId: carrier.playerId }),
    });
    state.lastPass = null;
  }
  state.possession = side;
  state.carrier = carrier;
  state.ball = point;
  state.underPressure = false;
};

export const killBall = (state: MatchState): void => {
  changePossession(state, null, null, state.ball);
};

export interface Restart {
  readonly side: Side;
  /** In the restarting side's frame. */
  readonly point: Point;
  readonly gapMs: readonly [number, number];
  readonly taker?: (state: MatchState) => Player | undefined;
}

export const stopPlay = (state: MatchState, restart: Restart): void => {
  killBall(state);
  const tempo = effectiveProfile(state, restart.side).tempo;
  state.clock.advance(sampleRange(state.rng, restart.gapMs) / tempo);
  runDueSubstitutions(state);
  const taker =
    restart.taker?.(state) ??
    state.rosters[restart.side].pickByZone(state.rng, restart.point.x);
  changePossession(state, restart.side, taker, restart.point);
};

export const kickOff = (state: MatchState, side: Side): void => {
  state.clock.advance(sampleRange(state.rng, DURATION.kickoffMs));
  const taker = state.rosters[side].pickByZone(state.rng, CENTRE_SPOT.x, {
    outfieldOnly: true,
  });
  changePossession(state, side, taker, CENTRE_SPOT);
};

/** Loose ball: possession is contested until someone recovers it. `point` is in the current frame. */
export const contestLooseBall = (
  state: MatchState,
  point: Point,
  attackerShare: number,
): void => {
  const attacker = possessingSide(state);
  killBall(state);
  state.clock.advance(sampleRange(state.rng, DURATION.contestedMs));
  const winner = state.rng.chance(attackerShare)
    ? attacker
    : opponentOf(attacker);
  const location = winner === attacker ? point : mirror(point);
  const player = state.rosters[winner].pickByZone(state.rng, location.x, {
    outfieldOnly: true,
  });
  state.sink.emit({
    type: 'RECOVERY',
    teamId: teamIdOf(state, winner),
    playerId: player.playerId,
    location: toPitchPoint(location),
  });
  changePossession(state, winner, player, location);
};
