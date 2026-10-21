import type { Fixture, MatchEvent, Player, Team } from '@matchiq/contracts';

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
const SQUAD_SIZE = 14;
const STARTERS = 11;

export const testProvenance = {
  kind: 'synthetic',
  generatorVersion: '0.1.0',
  seed: 7,
  scenario: 'ledger-test',
} as const;

const buildTeam = (key: string, shortName: string): Team => {
  const teamId = `tm_${key}`;
  const players: Player[] = Array.from({ length: SQUAD_SIZE }, (_, i) => ({
    playerId: `pl_${key}_${i + 1}`,
    teamId,
    displayName: `${shortName} Player ${i + 1}`,
    shirtNumber: i + 1,
    position: POSITIONS[i] ?? 'MF',
    starting: i < STARTERS,
    synthetic: true,
  }));
  return {
    teamId,
    name: `${shortName} Synthetic FC`,
    shortName,
    colors: { primary: '#1d4ed8', secondary: '#f8fafc' },
    formation: '4-3-3',
    players,
    synthetic: true,
  };
};

/** A contract-valid synthetic fixture for tests. */
export const buildTestFixture = (fixtureId: string): Fixture => ({
  schemaVersion: 1,
  fixtureId,
  title: 'Harbour City vs Northgate Rovers',
  competitionLabel: 'Synthetic Demo League',
  kickoffUtc: '2026-10-20T19:00:00Z',
  status: 'SCHEDULED',
  home: buildTeam('harbour', 'HAR'),
  away: buildTeam('northgate', 'NOR'),
  pitch: { lengthM: 105, widthM: 68 },
  provenance: testProvenance,
});

/** A contract-valid SHOT event; `overrides` must keep it contract-valid. */
export const buildTestEvent = (
  fixtureId: string,
  sequence: number,
  overrides: Partial<Pick<MatchEvent, 'eventId' | 'matchClockMs'>> = {},
): MatchEvent => ({
  schemaVersion: 1,
  eventId: `ev_${String(sequence).padStart(5, '0')}`,
  fixtureId,
  sequence,
  period: 1,
  matchClockMs: 60_000 + sequence * 1_000,
  wallClockUtc: '2026-10-20T19:31:00Z',
  provenance: testProvenance,
  type: 'SHOT',
  teamId: 'tm_harbour',
  playerId: 'pl_harbour_9',
  location: { x: 88, y: 52 },
  outcome: 'ON_TARGET',
  bodyPart: 'RIGHT_FOOT',
  ...overrides,
});
