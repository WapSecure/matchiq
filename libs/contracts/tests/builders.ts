import type { Fixture, MatchEvent, Player, Team } from '../src/index.js';

export const provenance = {
  kind: 'synthetic',
  generatorVersion: '0.1.0',
  seed: 42,
  scenario: 'comeback',
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
] as const;

export const buildTeam = (teamKey: string, shortName: string): Team => {
  const teamId = `tm_${teamKey}`;
  const players: Player[] = Array.from({ length: 14 }, (_, i) => ({
    playerId: `pl_${teamKey}_${i + 1}`,
    teamId,
    displayName: `${shortName} Player ${i + 1}`,
    shirtNumber: i + 1,
    position: POSITIONS[i] ?? 'MF',
    starting: i < 11,
    synthetic: true,
  }));
  return {
    teamId,
    name: `${teamKey[0]?.toUpperCase()}${teamKey.slice(1)} FC`,
    shortName,
    colors: { primary: '#1d4ed8', secondary: '#f8fafc' },
    formation: '4-3-3',
    players,
    synthetic: true,
  };
};

export const buildFixture = (): Fixture => ({
  schemaVersion: 1,
  fixtureId: 'fx_comeback_42',
  title: 'Harbour City vs Northgate Rovers',
  competitionLabel: 'Synthetic Demo League',
  kickoffUtc: '2026-10-20T19:00:00Z',
  status: 'SCHEDULED',
  home: buildTeam('harbour', 'HAR'),
  away: buildTeam('northgate', 'NOR'),
  pitch: { lengthM: 105, widthM: 68 },
  provenance,
});

const eventBase = {
  schemaVersion: 1,
  fixtureId: 'fx_comeback_42',
  period: 1,
  wallClockUtc: '2026-10-20T19:31:00Z',
  provenance,
} as const;

export const buildPassAttempt = (sequence: number): MatchEvent => ({
  ...eventBase,
  eventId: `ev_${String(sequence).padStart(5, '0')}`,
  sequence,
  matchClockMs: 1_850_000,
  type: 'PASS_ATTEMPTED',
  teamId: 'tm_harbour',
  playerId: 'pl_harbour_9',
  location: { x: 62.4, y: 40.1 },
  targetLocation: { x: 77.2, y: 33.4 },
  underPressure: true,
});

export const buildShot = (sequence: number): MatchEvent => ({
  ...eventBase,
  eventId: `ev_${String(sequence).padStart(5, '0')}`,
  sequence,
  matchClockMs: 1_860_000,
  type: 'SHOT',
  teamId: 'tm_harbour',
  playerId: 'pl_harbour_9',
  location: { x: 88, y: 52 },
  outcome: 'ON_TARGET',
  bodyPart: 'RIGHT_FOOT',
});
