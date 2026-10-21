import type { FORMATIONS, SCENARIO_NAMES } from './constants.js';

export type ScenarioName = (typeof SCENARIO_NAMES)[number];
export type Formation = keyof typeof FORMATIONS;
export type Side = 'home' | 'away';

/** Behavioural parameters in [0, 1] unless noted; tempo is a multiplier around 1. */
export interface TeamProfile {
  readonly strength: number;
  readonly pressing: number;
  readonly directness: number;
  readonly tempo: number;
  readonly shotPropensity: number;
  readonly formation: Formation;
}

/** `minute` is absolute match time: 0-45 first half, 45-90 second half. */
export type ScriptedBeat =
  | { readonly kind: 'goal'; readonly side: Side; readonly minute: number }
  | { readonly kind: 'red-card'; readonly side: Side; readonly minute: number };

export interface ScenarioPreset {
  readonly name: ScenarioName;
  readonly description: string;
  readonly home: TeamProfile;
  readonly away: TeamProfile;
  /** When false, only scripted beats score, so the result holds for every seed. */
  readonly naturalGoals: boolean;
  /** When false, only scripted beats send players off (no random reds or second yellows). */
  readonly naturalDismissals: boolean;
  readonly shotSpeedAvailable: boolean;
  readonly beats: readonly ScriptedBeat[];
}

export interface Score {
  readonly home: number;
  readonly away: number;
}
