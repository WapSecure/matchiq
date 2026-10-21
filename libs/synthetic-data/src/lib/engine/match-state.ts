import type { Fixture, Player, PlayerId, TeamId } from '@matchiq/contracts';
import { MODIFIERS } from '../constants.js';
import type { Rng } from '../prng.js';
import type {
  ScenarioPreset,
  ScriptedBeat,
  Side,
  TeamProfile,
} from '../types.js';
import type { EventSink } from './event-sink.js';
import type { GameClock } from './game-clock.js';
import type { Point } from './geometry.js';
import type { Roster } from './roster.js';

export interface LastPass {
  readonly passerId: PlayerId;
  readonly receiverId: PlayerId;
}

/** Mutable simulation state. `ball` is expressed in the possessing team's frame. */
export interface MatchState {
  readonly rng: Rng;
  readonly preset: ScenarioPreset;
  readonly fixture: Fixture;
  readonly sink: EventSink;
  readonly clock: GameClock;
  readonly rosters: Readonly<Record<Side, Roster>>;
  readonly score: Record<Side, number>;
  readonly pendingBeats: ScriptedBeat[];
  readonly substitutionPlan: Record<Side, number[]>;
  activeBeat: ScriptedBeat | null;
  possession: Side | null;
  carrier: Player | null;
  ball: Point;
  lastPass: LastPass | null;
  underPressure: boolean;
}

export type EffectiveProfile = Omit<TeamProfile, 'formation'> & {
  readonly fatigued: boolean;
};

export const opponentOf = (side: Side): Side =>
  side === 'home' ? 'away' : 'home';

export const teamIdOf = (state: MatchState, side: Side): TeamId =>
  state.fixture[side].teamId;

const unit = (value: number): number => Math.min(1, Math.max(0, value));

/** Applies match context: numerical disadvantage, chasing the game late on, fatigue. */
export const effectiveProfile = (
  state: MatchState,
  side: Side,
): EffectiveProfile => {
  const base = state.preset[side];
  const missing = state.rosters[side].missingPlayers;
  const minute = state.clock.absoluteMinute;
  const chasing =
    minute >= MODIFIERS.chasingFromMinute &&
    state.score[side] < state.score[opponentOf(side)];
  return {
    strength: unit(base.strength - missing * MODIFIERS.redCardStrengthPenalty),
    pressing: unit(
      base.pressing -
        missing * MODIFIERS.redCardPressingPenalty +
        (chasing ? MODIFIERS.chasingPressingBoost : 0),
    ),
    directness: unit(
      base.directness + (chasing ? MODIFIERS.chasingDirectnessBoost : 0),
    ),
    tempo: base.tempo,
    shotPropensity:
      base.shotPropensity * (chasing ? MODIFIERS.chasingShotBoost : 1),
    fatigued: minute >= MODIFIERS.fatigueFromMinute,
  };
};

export const possessingSide = (state: MatchState): Side => {
  if (state.possession === null) throw new Error('ball is not in possession');
  return state.possession;
};

export const currentCarrier = (state: MatchState): Player => {
  if (state.carrier === null) throw new Error('no ball carrier');
  return state.carrier;
};

export const sampleRange = (
  rng: Rng,
  [min, max]: readonly [number, number],
): number => rng.range(min, max);
