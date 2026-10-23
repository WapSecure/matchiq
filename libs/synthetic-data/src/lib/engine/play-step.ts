import { ACTION_WEIGHT, PITCH } from '../constants.js';
import type { ScriptedBeat } from '../types.js';
import { carryBall } from './carry.js';
import { commitFoul, contestCarrier, pickChallenger } from './defence.js';
import {
  type MatchState,
  effectiveProfile,
  possessingSide,
} from './match-state.js';
import { attemptPass } from './pass.js';
import { takeShot } from './shot.js';

type Action = 'pass' | 'carry' | 'shot';

const chooseAction = (state: MatchState): Action => {
  const profile = effectiveProfile(state, possessingSide(state));
  const { x } = state.ball;
  let shotWeight = 0;
  if (x >= PITCH.boxX) shotWeight = ACTION_WEIGHT.shotInBox;
  else if (x >= PITCH.shotRangeX) shotWeight = ACTION_WEIGHT.shotInRange;
  return state.rng.weighted<Action>([
    ['pass', ACTION_WEIGHT.pass],
    [
      'carry',
      ACTION_WEIGHT.carryBase +
        ACTION_WEIGHT.carryDirectness * profile.directness,
    ],
    ['shot', shotWeight * profile.shotPropensity],
  ]);
};

/** Activates the next scripted beat once its minute arrives in the current period. */
export const activateDueBeat = (state: MatchState): void => {
  const next = state.pendingBeats[0];
  if (state.activeBeat !== null || next === undefined) return;
  if (next.minute <= state.clock.absoluteMinute) {
    state.activeBeat = next;
    state.pendingBeats.shift();
  }
};

/** Steers play towards the beat; returns false when this step should play naturally. */
const playBeat = (state: MatchState, beat: ScriptedBeat): boolean => {
  const attacking = possessingSide(state) === beat.side;
  if (beat.kind === 'red-card') {
    if (attacking) return false;
    commitFoul(state, pickChallenger(state), 'RED');
    state.activeBeat = null;
    return true;
  }
  if (!attacking) {
    attemptPass(state, 'intercepted');
    return true;
  }
  if (state.ball.x >= PITCH.boxX) {
    takeShot(state, true, beat.kind === 'ruled-out-goal');
    state.activeBeat = null;
    return true;
  }
  attemptPass(state, 'complete');
  return true;
};

export const playStep = (state: MatchState): void => {
  if (state.activeBeat !== null && playBeat(state, state.activeBeat)) return;
  if (contestCarrier(state)) return;
  const action = chooseAction(state);
  if (action === 'shot') takeShot(state, false);
  else if (action === 'carry') carryBall(state);
  else attemptPass(state);
};
