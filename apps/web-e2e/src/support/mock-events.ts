import type { MatchEvent } from '@matchiq/contracts';
import {
  AWAY_ID,
  FIXTURE_ID,
  HOME_ID,
  SYNTHETIC_PROVENANCE,
} from './mock-fixture';

const MINUTE = 60_000;
const SECOND_HALF = 2;

const base = (sequence: number, clockMs: number) => ({
  schemaVersion: 1 as const,
  eventId: `ev_${sequence}`,
  fixtureId: FIXTURE_ID,
  sequence,
  period: SECOND_HALF,
  matchClockMs: clockMs,
  wallClockUtc: '2026-10-24T15:07:00Z',
  provenance: SYNTHETIC_PROVENANCE,
});

const at = (x: number, y: number) => ({ x, y });

const EVENTS: MatchEvent[] = [
  {
    ...base(601, 14 * MINUTE),
    type: 'RECOVERY',
    teamId: HOME_ID,
    playerId: 'pl_home_07',
    location: at(62, 40),
  },
  {
    ...base(604, 15 * MINUTE),
    type: 'FINAL_THIRD_ENTRY',
    teamId: HOME_ID,
    playerId: 'pl_home_08',
    location: at(70, 35),
  },
  {
    ...base(607, 16 * MINUTE),
    type: 'SHOT',
    teamId: HOME_ID,
    playerId: 'pl_home_09',
    location: at(86, 48),
    outcome: 'ON_TARGET',
    bodyPart: 'RIGHT_FOOT',
  },
  {
    ...base(608, 16 * MINUTE + 2_000),
    type: 'SAVE',
    teamId: AWAY_ID,
    playerId: 'pl_away_01',
    shotEventId: 'ev_607',
  },
  {
    ...base(615, 17 * MINUTE),
    type: 'FOUL',
    teamId: AWAY_ID,
    playerId: 'pl_away_06',
    victimPlayerId: 'pl_home_10',
    location: at(40, 60),
  },
  {
    ...base(616, 17 * MINUTE + 5_000),
    type: 'CARD',
    teamId: AWAY_ID,
    playerId: 'pl_away_06',
    card: 'YELLOW',
    foulEventId: 'ev_615',
  },
  {
    ...base(622, 19 * MINUTE),
    type: 'TACKLE',
    teamId: HOME_ID,
    playerId: 'pl_home_06',
    opponentPlayerId: 'pl_away_10',
    location: at(58, 52),
    won: true,
  },
  {
    ...base(625, 20 * MINUTE),
    type: 'SHOT',
    teamId: HOME_ID,
    playerId: 'pl_home_11',
    location: at(88, 44),
    outcome: 'ON_TARGET',
    bodyPart: 'LEFT_FOOT',
  },
  {
    ...base(626, 20 * MINUTE + 1_000),
    type: 'GOAL',
    teamId: HOME_ID,
    playerId: 'pl_home_11',
    shotEventId: 'ev_625',
    assistPlayerId: 'pl_home_08',
    ownGoal: false,
  },
  {
    ...base(633, 21 * MINUTE),
    type: 'SUBSTITUTION',
    teamId: AWAY_ID,
    playerOutId: 'pl_away_09',
    playerInId: 'pl_away_13',
  },
];

export const mockEvents = (): MatchEvent[] => EVENTS;
