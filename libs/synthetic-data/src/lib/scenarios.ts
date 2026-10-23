import { SCENARIO_NAMES } from './constants.js';
import type { ScenarioName, ScenarioPreset, TeamProfile } from './types.js';

const balanced: TeamProfile = {
  strength: 0.6,
  pressing: 0.5,
  directness: 0.5,
  tempo: 1,
  shotPropensity: 1,
  formation: '4-3-3',
};

export const SCENARIOS: Readonly<Record<ScenarioName, ScenarioPreset>> = {
  comeback: {
    name: 'comeback',
    description:
      'Away side goes two up before the break; home side turns it around late to win 3-2.',
    home: { ...balanced, formation: '4-2-3-1' },
    away: { ...balanced, pressing: 0.45, directness: 0.6 },
    naturalGoals: false,
    naturalDismissals: false,
    shotSpeedAvailable: true,
    beats: [
      { kind: 'goal', side: 'away', minute: 22 },
      { kind: 'goal', side: 'away', minute: 40 },
      { kind: 'goal', side: 'home', minute: 64 },
      { kind: 'goal', side: 'home', minute: 77 },
      { kind: 'goal', side: 'home', minute: 87 },
    ],
  },
  'possession-dominance': {
    name: 'possession-dominance',
    description:
      'Home side controls the ball and territory but cannot score; ends 0-0.',
    home: {
      strength: 0.88,
      pressing: 0.72,
      directness: 0.22,
      tempo: 1,
      shotPropensity: 0.75,
      formation: '4-3-3',
    },
    away: {
      strength: 0.32,
      pressing: 0.25,
      directness: 0.75,
      tempo: 0.85,
      shotPropensity: 0.8,
      formation: '4-4-2',
    },
    naturalGoals: false,
    naturalDismissals: false,
    shotSpeedAvailable: true,
    beats: [],
  },
  'red-card-swing': {
    name: 'red-card-swing',
    description:
      'Home side leads, has a player sent off, and the away side wins 2-1 against ten men.',
    home: balanced,
    away: { ...balanced, strength: 0.62, formation: '4-4-2' },
    naturalGoals: false,
    naturalDismissals: false,
    shotSpeedAvailable: true,
    beats: [
      { kind: 'goal', side: 'home', minute: 14 },
      { kind: 'red-card', side: 'home', minute: 31 },
      { kind: 'goal', side: 'away', minute: 58 },
      { kind: 'goal', side: 'away', minute: 79 },
    ],
  },
  'high-press': {
    name: 'high-press',
    description:
      'Both sides press aggressively: frequent pressures, tackles, recoveries and transitions.',
    home: { ...balanced, pressing: 0.92, directness: 0.62, tempo: 0.93 },
    away: {
      ...balanced,
      pressing: 0.88,
      directness: 0.6,
      tempo: 0.92,
      formation: '3-5-2',
    },
    naturalGoals: true,
    naturalDismissals: true,
    shotSpeedAvailable: true,
    beats: [],
  },
  'disallowed-goal': {
    name: 'disallowed-goal',
    description:
      'Home side has an early goal ruled out after review, falls behind, then wins 2-1.',
    home: { ...balanced, formation: '4-2-3-1' },
    away: { ...balanced, formation: '4-4-2' },
    naturalGoals: false,
    naturalDismissals: false,
    shotSpeedAvailable: true,
    beats: [
      { kind: 'ruled-out-goal', side: 'home', minute: 18 },
      { kind: 'goal', side: 'away', minute: 33 },
      { kind: 'goal', side: 'home', minute: 61 },
      { kind: 'goal', side: 'home', minute: 80 },
    ],
  },
  'low-event': {
    name: 'low-event',
    description:
      'Cagey, slow game with few shots and long stoppages; shot speed is not measured.',
    home: {
      strength: 0.45,
      pressing: 0.18,
      directness: 0.3,
      tempo: 0.62,
      shotPropensity: 0.5,
      formation: '4-4-2',
    },
    away: {
      strength: 0.45,
      pressing: 0.2,
      directness: 0.35,
      tempo: 0.6,
      shotPropensity: 0.5,
      formation: '4-4-2',
    },
    naturalGoals: true,
    naturalDismissals: true,
    shotSpeedAvailable: false,
    beats: [],
  },
};

export const isScenarioName = (value: string): value is ScenarioName =>
  (SCENARIO_NAMES as readonly string[]).includes(value);
