import { DURATION, SUBSTITUTIONS, TIME } from '../constants.js';
import type { Rng } from '../prng.js';
import type { Side } from '../types.js';
import { type MatchState, sampleRange, teamIdOf } from './match-state.js';

const HALF_TIME_MINUTE = TIME.periodLengthMs / TIME.msPerMinute;
const SIDES: readonly Side[] = ['home', 'away'];

const planSide = (rng: Rng): number[] => {
  const count = rng.int(SUBSTITUTIONS.minPerTeam, SUBSTITUTIONS.maxPerTeam);
  return Array.from({ length: count }, () =>
    rng.chance(SUBSTITUTIONS.halfTimeShare)
      ? HALF_TIME_MINUTE
      : rng.int(SUBSTITUTIONS.earliestMinute, SUBSTITUTIONS.latestMinute),
  ).sort((a, b) => a - b);
};

export const planSubstitutions = (rng: Rng): Record<Side, number[]> => ({
  home: planSide(rng),
  away: planSide(rng),
});

/** Called only while the ball is dead. The plan starts at half-time, so first-half stoppages never trigger changes. */
export const runDueSubstitutions = (state: MatchState): void => {
  if (state.clock.period === 1) return;
  let made = 0;
  for (const side of SIDES) {
    const plan = state.substitutionPlan[side];
    while (
      plan.length > 0 &&
      (plan[0] ?? Infinity) <= state.clock.absoluteMinute
    ) {
      plan.shift();
      const pair = state.rosters[side].substitute(state.rng);
      if (pair === null) continue;
      state.sink.emit({
        type: 'SUBSTITUTION',
        teamId: teamIdOf(state, side),
        playerOutId: pair.out.playerId,
        playerInId: pair.in.playerId,
      });
      made += 1;
    }
  }
  if (made > 0) {
    state.clock.advance(sampleRange(state.rng, DURATION.substitutionMs));
  }
};
