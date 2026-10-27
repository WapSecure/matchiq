import type { ShotOutcome } from '@matchiq/contracts';
import { NOT_AVAILABLE } from './match';

export const PITCH_VIEWS = ['events', 'shots', 'passes'] as const;
export type PitchView = (typeof PITCH_VIEWS)[number];

/** Completed passes drawn per team: hardest synthetic difficulty first, longest on ties. */
export const PASS_TOP_N = 12;

/** Difficulty is 0-100; these cut-offs pick the line style, never colour alone. */
export const DIFFICULTY_BANDS = { medium: 40, high: 60 } as const;
export type DifficultyBand = 'lower' | 'medium' | 'higher';

/** Metres in the pitch viewBox; line widths and dashes per band. */
export const PASS_STROKE: Record<
  DifficultyBand,
  { width: number; dash: string | undefined }
> = {
  lower: { width: 0.45, dash: '0.6 1.1' },
  medium: { width: 0.8, dash: '2.2 1.1' },
  higher: { width: 1.3, dash: undefined },
};

/** About 24 px on a phone: a wide invisible stroke keeps lines easy to tap. */
export const PASS_HIT_WIDTH = 6;
export const PASS_HEAD = 2.4;

/** Shot marker radius in metres: goals largest, on target, then off target and blocked. */
export const SHOT_RADIUS: Record<'goal' | 'onTarget' | 'offTarget', number> = {
  goal: 2.6,
  onTarget: 1.8,
  offTarget: 1.25,
};
/** About 24 px across on a phone. */
export const SHOT_HIT_RADIUS = 3.4;

export const SHOT_OUTCOME_LABEL: Record<ShotOutcome, string> = {
  ON_TARGET: 'On target',
  OFF_TARGET: 'Off target',
  BLOCKED: 'Blocked',
  WOODWORK: 'Hit the woodwork',
};

export const DEPTH_COPY = {
  viewLegend: 'Map view',
  views: { events: 'Events', shots: 'Shots', passes: 'Passes' },
  stepLegend: 'Step through marks',
  previous: 'Previous',
  next: 'Next',
  stepPosition: (index: number, total: number) => `${index} of ${total}`,
  none: NOT_AVAILABLE,
  speed: (kph: number) => `${Number(kph.toFixed(1))} km/h`,
  distance: (m: number) => `${m.toFixed(1)} m`,
  difficulty: (value: number) => value.toFixed(0),
  xgLabel: 'xG baseline (synthetic, not calibrated)',
  xg: (value: number) => value.toFixed(2),
  shots: {
    title: 'Shot map',
    summary: (count: number) =>
      count === 0
        ? 'No shots for this selection yet.'
        : `${count} shot${count === 1 ? '' : 's'} plotted by where they were taken. Bigger marks scored or hit the target.`,
    empty: 'No shots for this team yet.',
    emptyHint: 'This map updates as soon as a shot is recorded.',
    legendGoal: 'Largest: goal',
    legendOn: 'Filled: on target',
    legendOff: 'Small, hollow: off target or blocked',
    hint: 'Tap a mark or use Previous and Next for details.',
    speedNote: 'Speed shows when the data recorded one.',
    columns: {
      minute: 'Minute',
      team: 'Team',
      player: 'Player',
      outcome: 'Outcome',
      speed: 'Shot speed',
    },
    goal: 'Goal',
  },
  passes: {
    title: 'Pass map',
    summary: (count: number) =>
      count === 0
        ? 'No completed passes for this selection yet.'
        : `${count} completed pass${count === 1 ? '' : 'es'} drawn as arrows from start to end.`,
    empty: 'No completed passes for this team yet.',
    emptyHint: 'This map updates as soon as a completed pass is recorded.',
    rule: (n: number) =>
      `Showing the ${n} most difficult completed passes per team (synthetic difficulty, longest first on ties), not every pass.`,
    shown: (shown: number, total: number) => `${shown} of ${total} passes`,
    legendTitle: 'Synthetic difficulty',
    bands: {
      lower: 'Dotted, thin: lower',
      medium: 'Dashed: medium',
      higher: 'Solid, thick: higher',
    },
    hint: 'Tap an arrow or use Previous and Next for details.',
    pressure: 'Under pressure',
    columns: {
      minute: 'Minute',
      team: 'Team',
      player: 'Player',
      distance: 'Distance (m)',
      difficulty: 'Difficulty (synthetic)',
    },
  },
} as const;
