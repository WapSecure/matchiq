import type { MatchEventOf } from '@matchiq/contracts';
import {
  passDifficulty,
  passDistanceM,
  xgBaseline,
} from '../metrics/geometry.js';
import type {
  DerivedState,
  FixtureContext,
  PassGeometry,
  Side,
  TeamTally,
} from '../types.js';

const addToTally = (
  derived: DerivedState,
  side: Side,
  patch: Partial<TeamTally>,
): DerivedState => ({
  ...derived,
  tallies: {
    ...derived.tallies,
    [side]: { ...derived.tallies[side], ...patch },
  },
});

/** Adds xG baseline and, when the event carries one, shot speed. */
export const withShotMeasures = (
  derived: DerivedState,
  side: Side,
  event: MatchEventOf<'SHOT'>,
  context: FixtureContext,
): DerivedState => {
  const tally = derived.tallies[side];
  const xg = { xgSum: tally.xgSum + xgBaseline(event.location, context.pitch) };
  const speed = event.speedKph;
  return addToTally(
    derived,
    side,
    speed === undefined
      ? xg
      : {
          ...xg,
          shotSpeedSumKph: tally.shotSpeedSumKph + speed,
          shotSpeedMaxKph: Math.max(tally.shotSpeedMaxKph, speed),
          speedShots: tally.speedShots + 1,
        },
  );
};

export const passGeometryOf = (
  event: MatchEventOf<'PASS_ATTEMPTED'>,
  context: FixtureContext,
): PassGeometry => ({
  distanceM: passDistanceM(event.location, event.targetLocation, context.pitch),
  difficulty: passDifficulty(
    event.location,
    event.targetLocation,
    context.pitch,
    event.underPressure,
  ),
});

/** Adds a completed pass's geometry to its team's running sums. */
export const withPassMeasures = (
  derived: DerivedState,
  side: Side,
  geometry: PassGeometry | undefined,
): DerivedState => {
  if (geometry === undefined) return derived;
  const tally = derived.tallies[side];
  return addToTally(derived, side, {
    passDistanceSumM: tally.passDistanceSumM + geometry.distanceM,
    passDifficultySum: tally.passDifficultySum + geometry.difficulty,
    geometryPasses: tally.geometryPasses + 1,
  });
};
