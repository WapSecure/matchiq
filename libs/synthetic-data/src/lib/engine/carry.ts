import { DURATION, MOVEMENT } from '../constants.js';
import { clampPoint, entersFinalThird, toPitchPoint } from './geometry.js';
import {
  type MatchState,
  currentCarrier,
  effectiveProfile,
  possessingSide,
  sampleRange,
  teamIdOf,
} from './match-state.js';

export const carryBall = (state: MatchState): void => {
  const side = possessingSide(state);
  const carrier = currentCarrier(state);
  const profile = effectiveProfile(state, side);
  const forward =
    sampleRange(state.rng, MOVEMENT.carryForward) *
    (MOVEMENT.carryDirectnessFloor + profile.directness);
  const lateral = state.rng.range(
    -MOVEMENT.carryLateralMax,
    MOVEMENT.carryLateralMax,
  );
  const end = clampPoint({
    x: state.ball.x + forward,
    y: state.ball.y + lateral,
  });
  const teamId = teamIdOf(state, side);
  state.sink.emit({
    type: 'CARRY',
    teamId,
    playerId: carrier.playerId,
    location: toPitchPoint(state.ball),
    endLocation: toPitchPoint(end),
  });
  state.clock.advance(sampleRange(state.rng, DURATION.carryMs) / profile.tempo);
  if (entersFinalThird(state.ball, end)) {
    state.sink.emit({
      type: 'FINAL_THIRD_ENTRY',
      teamId,
      playerId: carrier.playerId,
      location: toPitchPoint(end),
    });
  }
  state.ball = end;
  state.underPressure = false;
};
