import {
  Fixture,
  MatchEvent,
  type Fixture as FixtureT,
  type MatchEvent as MatchEventT,
  type MatchEventOf,
  type Player,
  type Team,
} from '@matchiq/contracts';

export const FIXTURE_ID = 'fx_engine_test';
export const TEAM = { home: 'tm_harbour', away: 'tm_northgate' } as const;
export const TEAM_NAME = {
  home: 'Harbour City',
  away: 'Northgate Rovers',
} as const;
export type TestSide = keyof typeof TEAM;
export const MIN = 60_000;

const provenance = {
  kind: 'synthetic',
  generatorVersion: '0.1.0',
  seed: 7,
  scenario: 'engine-test',
} as const;

const buildTeam = (side: TestSide): Team => {
  const key = TEAM[side].slice(3);
  const players: Player[] = Array.from({ length: 14 }, (_, i) => ({
    playerId: `pl_${key}_${i + 1}`,
    teamId: TEAM[side],
    displayName: `${TEAM_NAME[side]} ${i + 1}`,
    shirtNumber: i + 1,
    position: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW',
    starting: i < 11,
    synthetic: true,
  }));
  return {
    teamId: TEAM[side],
    name: TEAM_NAME[side],
    shortName: side === 'home' ? 'HAR' : 'NOR',
    colors: { primary: '#1d4ed8', secondary: '#f8fafc' },
    formation: '4-3-3',
    players,
    synthetic: true,
  };
};

export const buildFixture = (): FixtureT =>
  Fixture.parse({
    schemaVersion: 1,
    fixtureId: FIXTURE_ID,
    title: 'Harbour City vs Northgate Rovers',
    competitionLabel: 'Synthetic Demo League',
    kickoffUtc: '2026-10-20T19:00:00Z',
    status: 'SCHEDULED',
    home: buildTeam('home'),
    away: buildTeam('away'),
    pitch: { lengthM: 105, widthM: 68 },
    provenance,
  });

export const player = (side: TestSide, n = 9): string =>
  `pl_${TEAM[side].slice(3)}_${n}`;

const KICKOFF_MS = Date.UTC(2026, 9, 20, 19, 0, 0);
const PERIOD_OFFSET_MS = 60 * MIN;
const PT = { x: 50, y: 50 };

type Body = Record<string, unknown> & { type: MatchEventT['type'] };

/**
 * Hand-written event script: sequences and ids auto-increment, every event is
 * validated against the contract, and `at(period, clockMs)` moves the clock.
 */
export const script = (startSequence = 0) => {
  let sequence = startSequence;
  let period = 1;
  let clockMs = 0;
  const events: MatchEventT[] = [];

  const emit = <T extends MatchEventT['type']>(
    body: Body & { type: T },
  ): MatchEventOf<T> => {
    const event = MatchEvent.parse({
      schemaVersion: 1,
      eventId: `ev_${String(sequence).padStart(5, '0')}`,
      fixtureId: FIXTURE_ID,
      sequence,
      period,
      matchClockMs: clockMs,
      wallClockUtc: new Date(
        KICKOFF_MS + (period - 1) * PERIOD_OFFSET_MS + clockMs,
      ).toISOString(),
      provenance,
      ...body,
    }) as MatchEventOf<T>;
    sequence += 1;
    events.push(event);
    return event;
  };
  const actor = (side: TestSide) => ({
    teamId: TEAM[side],
    playerId: player(side),
  });

  const api = {
    events,
    at(p: number, ms: number) {
      period = p;
      clockMs = ms;
      return api;
    },
    matchStarted: () => emit({ type: 'MATCH_STARTED' }),
    periodStarted: () => emit({ type: 'PERIOD_STARTED' }),
    periodEnded: () => emit({ type: 'PERIOD_ENDED' }),
    matchEnded: () => emit({ type: 'MATCH_ENDED' }),
    pass: (side: TestSide, targetX = PT.x) =>
      emit({
        type: 'PASS_ATTEMPTED',
        ...actor(side),
        location: PT,
        targetLocation: { x: targetX, y: PT.y },
        underPressure: false,
      }),
    completed: (side: TestSide, attemptEventId: string) =>
      emit({
        type: 'PASS_COMPLETED',
        ...actor(side),
        attemptEventId,
        location: PT,
      }),
    shot: (side: TestSide, outcome = 'OFF_TARGET') =>
      emit({
        type: 'SHOT',
        ...actor(side),
        location: { x: 88, y: 50 },
        outcome,
        bodyPart: 'RIGHT_FOOT',
      }),
    goal: (side: TestSide, shotEventId: string, ownGoal = false) =>
      emit({ type: 'GOAL', ...actor(side), shotEventId, ownGoal }),
    pressure: (side: TestSide) =>
      emit({
        type: 'PRESSURE_APPLIED',
        ...actor(side),
        targetPlayerId: player(side === 'home' ? 'away' : 'home'),
        location: PT,
      }),
    recovery: (side: TestSide, x = 40) =>
      emit({ type: 'RECOVERY', ...actor(side), location: { x, y: 50 } }),
    entry: (side: TestSide) =>
      emit({
        type: 'FINAL_THIRD_ENTRY',
        ...actor(side),
        location: { x: 70, y: 50 },
      }),
    foul: (side: TestSide) =>
      emit({ type: 'FOUL', ...actor(side), location: PT }),
    card: (side: TestSide, card: 'YELLOW' | 'SECOND_YELLOW' | 'RED') =>
      emit({ type: 'CARD', ...actor(side), card }),
    possession: (side: TestSide | null) =>
      emit({
        type: 'POSSESSION_CHANGED',
        teamId: side === null ? null : TEAM[side],
      }),
    voids: (correctedEventId: string) =>
      emit({
        type: 'CORRECTION',
        correctedEventId,
        action: 'VOID',
        reason: 'test correction',
      }),
  };
  return api;
};

/** A kicked-off first period at clock 0. */
export const kickedOff = () => {
  const s = script();
  s.at(1, 0).matchStarted();
  s.periodStarted();
  return s;
};
