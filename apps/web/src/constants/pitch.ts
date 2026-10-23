import type { ShotOutcome } from '@matchiq/contracts';

/** IFAB Law 1 dimensions in metres, plus drawing parameters. */
export const PITCH_MARKINGS_M = {
  centreCircle: 9.15,
  penaltyBox: 16.5,
  penaltyBoxWidth: 40.32,
  goalArea: 5.5,
  goalAreaWidth: 18.32,
  penaltySpot: 11,
  spot: 0.35,
  stripes: 12,
  lineWidthPx: 1.25,
} as const;

/** Fallback when a fixture has no pitch size (contracts default range). */
export const DEFAULT_PITCH = { lengthM: 105, widthM: 68 } as const;

/** Contract coordinates run 0..100 on both axes. */
export const PITCH_COORD_MAX = 100;

/** Mark radius in metres; ~8 px across on a 390 px phone. */
export const PITCH_MARK = { radius: 1.5, goalRadius: 1.9, ring: 0.5 } as const;

export const PITCH_KINDS = [
  'GOAL',
  'SHOT',
  'RECOVERY',
  'FINAL_THIRD_ENTRY',
] as const;
export type PitchKind = (typeof PITCH_KINDS)[number];

export type PitchTeamFilter = 'all' | 'home' | 'away';

export const ON_TARGET_OUTCOMES: ReadonlySet<ShotOutcome> = new Set([
  'ON_TARGET',
  'WOODWORK',
]);

export const PITCH_COPY = {
  title: 'Pitch event map',
  description: 'Shots, goals, ball recoveries and final third entries',
  svgTitle: 'Pitch event map',
  summary: (count: number, window: string | null) =>
    count === 0
      ? 'No events match the current filters.'
      : `${count} event${count === 1 ? '' : 's'} plotted${window ? `, ${window}` : ''}. Each team attacks the goal its arrow points to.`,
  window: (from: string, to: string) => `${from} to ${to}`,
  windowNote: (from: string, to: string) =>
    `Showing ${from}–${to}. Totals come from the match stats.`,
  teamLegend: 'Team',
  allTeams: 'Both',
  kindLegend: 'Event types',
  kinds: {
    GOAL: 'Goals',
    SHOT: 'Shots',
    RECOVERY: 'Recoveries',
    FINAL_THIRD_ENTRY: 'Final third entries',
  },
  kind: {
    GOAL: 'Goal',
    SHOT: 'Shot',
    RECOVERY: 'Ball recovery',
    FINAL_THIRD_ENTRY: 'Final third entry',
  },
  offTarget: 'Hollow circle: shot off target or blocked.',
  attacks: (team: string) => `${team} attack`,
  empty: 'No shots, recoveries or final third entries yet.',
  hint: 'Hover a mark for details, or open the table.',
  tableToggle: 'View as table',
  columns: {
    minute: 'Minute',
    team: 'Team',
    event: 'Event',
    player: 'Player',
    position: 'Position (x, y)',
  },
  position: (x: number, y: number) => `${Math.round(x)}, ${Math.round(y)}`,
  positionNote:
    'Position is on a 0–100 scale: x runs towards the goal the team attacks, y from its right touchline.',
} as const;
