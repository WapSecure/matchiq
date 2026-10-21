import type { Fixture, Player, Team } from '@matchiq/contracts';

export const TEMPLATE_ID = 'fx_late_comeback';
/** A replay session of the template; the studio, stream and reads use it. */
export const FIXTURE_ID = `${TEMPLATE_ID}_s1`;
export const HOME_ID = 'tm_northbridge';
export const AWAY_ID = 'tm_harbourside';

const PROVENANCE = {
  kind: 'synthetic',
  generatorVersion: '1.0.0',
  seed: 4207,
  scenario: 'late-comeback',
} as const;

const POSITIONS = [
  'GK',
  'DF',
  'DF',
  'DF',
  'DF',
  'MF',
  'MF',
  'MF',
  'FW',
  'FW',
  'FW',
  'MF',
  'FW',
] as const;

const SURNAMES = {
  home: [
    'Okafor',
    'Lindqvist',
    'Moreau',
    'Achterberg',
    'Sato',
    'Varga',
    'Ibarra',
    'Kowal',
    'Adeyemi',
    'Brennan',
    'Castell',
    'Duarte',
    'Ferris',
  ],
  away: [
    'Halloran',
    'Nakamura',
    'Petrov',
    'Quist',
    'Rahman',
    'Silvestri',
    'Tanaka',
    'Ulloa',
    'Vidal',
    'Whitlock',
    'Yilmaz',
    'Zeller',
    'Abara',
  ],
} as const;

const players = (side: 'home' | 'away', teamId: string): Player[] =>
  POSITIONS.map((position, i) => ({
    playerId: `pl_${side}_${String(i + 1).padStart(2, '0')}`,
    teamId,
    displayName: SURNAMES[side][i] ?? `Player ${i + 1}`,
    shirtNumber: i + 1,
    position,
    starting: i < 11,
    synthetic: true,
  }));

const team = (side: 'home' | 'away'): Team => ({
  teamId: side === 'home' ? HOME_ID : AWAY_ID,
  name: side === 'home' ? 'Northbridge Athletic' : 'Harbourside Rovers',
  shortName: side === 'home' ? 'NBA' : 'HSR',
  colors:
    side === 'home'
      ? { primary: '#1d4ed8', secondary: '#ffffff' }
      : { primary: '#d97706', secondary: '#111827' },
  formation: side === 'home' ? '4-3-3' : '4-2-3-1',
  players: players(side, side === 'home' ? HOME_ID : AWAY_ID),
  synthetic: true,
});

export const mockFixture = (overrides: Partial<Fixture> = {}): Fixture => ({
  schemaVersion: 1,
  fixtureId: FIXTURE_ID,
  title: 'Northbridge Athletic v Harbourside Rovers',
  competitionLabel: 'Synthetic League · Matchday 9',
  kickoffUtc: '2026-10-24T14:00:00Z',
  status: 'LIVE',
  home: team('home'),
  away: team('away'),
  pitch: { lengthM: 105, widthM: 68 },
  provenance: PROVENANCE,
  ...overrides,
});

export const SYNTHETIC_PROVENANCE = PROVENANCE;
