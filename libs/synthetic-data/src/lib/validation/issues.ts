import type { Score } from '../types.js';

export const FIXTURE_ISSUE_CODES = [
  'SCHEMA_INVALID',
  'FIXTURE_MISMATCH',
  'SEQUENCE_GAP',
  'DUPLICATE_EVENT_ID',
  'CLOCK_REGRESSION',
  'PERIOD_STRUCTURE',
  'EVENT_AFTER_MATCH_END',
  'UNKNOWN_TEAM',
  'UNKNOWN_PLAYER',
  'WRONG_TEAM',
  'PLAYER_NOT_ON_PITCH',
  'INVALID_SUBSTITUTION',
  'INVALID_CARD',
  'INVALID_POSSESSION',
  'DANGLING_REFERENCE',
  'REFERENCE_MISMATCH',
  'MANIFEST_MISMATCH',
] as const;

export type FixtureIssueCode = (typeof FIXTURE_ISSUE_CODES)[number];

export interface FixtureIssue {
  readonly code: FixtureIssueCode;
  readonly message: string;
  readonly sequence?: number;
  readonly eventId?: string;
  readonly path?: readonly PropertyKey[];
}

export interface ValidationReport {
  readonly valid: boolean;
  readonly issues: readonly FixtureIssue[];
  /** Score derived solely from GOAL events; null when the input could not be parsed. */
  readonly score: Score | null;
  readonly eventCount: number;
}

export const ISSUE_MESSAGES = {
  fixtureId: (actual: string, expected: string) =>
    `fixtureId ${actual} does not match fixture ${expected}`,
  provenance: 'event provenance differs from fixture provenance',
  sequence: (actual: number, expected: number) =>
    `sequence ${actual} found where ${expected} was expected`,
  duplicateId: (id: string) => `eventId ${id} is not unique`,
  clock: (actual: number, previous: number) =>
    `matchClockMs ${actual} precedes ${previous} in the same period`,
  wallClock: 'wallClockUtc moves backwards',
  periodRegress: (actual: number, previous: number) =>
    `period ${actual} follows period ${previous}`,
  periodSkip: (actual: number, previous: number) =>
    `period ${actual} cannot follow period ${previous} without PERIOD_STARTED`,
  matchStartFirst: 'the first event must be MATCH_STARTED',
  matchStartOnce: 'MATCH_STARTED may only appear once, first',
  periodOrder: (actual: number, expected: number) =>
    `PERIOD_STARTED for period ${actual}, expected ${expected}`,
  periodAlreadyOpen: 'PERIOD_STARTED while a period is open',
  periodNotOpen: (period: number) => `period ${period} is not in progress`,
  matchEndOpen: 'MATCH_ENDED while a period is open or before any period',
  afterEnd: 'event after MATCH_ENDED',
  missingEnd: 'stream does not finish with MATCH_ENDED',
  unknownTeam: (teamId: string) => `team ${teamId} is not in this fixture`,
  unknownPlayer: (playerId: string) =>
    `player ${playerId} is not in either squad`,
  wrongTeam: (playerId: string, expected: string) =>
    `player ${playerId} does not play for ${expected}`,
  notOnPitch: (playerId: string) => `player ${playerId} is not on the pitch`,
  subOut: (playerId: string) =>
    `substituted player ${playerId} is not on the pitch`,
  subIn: (playerId: string) =>
    `incoming player ${playerId} is not an unused substitute`,
  secondYellow: (playerId: string) =>
    `SECOND_YELLOW for ${playerId} without a prior YELLOW`,
  repeatYellow: (playerId: string) =>
    `second YELLOW for ${playerId} must be SECOND_YELLOW`,
  possessionPlayer: 'contested possession (teamId null) cannot name a player',
  possessionRedundant: 'POSSESSION_CHANGED does not change possession',
  dangling: (field: string, id: string) =>
    `${field} ${id} does not reference an earlier event`,
  referenceType: (field: string, expected: string) =>
    `${field} must reference a ${expected}`,
  resolvedTwice: (id: string) => `event ${id} is already resolved`,
  passTeam: 'pass resolution team is inconsistent with the attempt',
  shotTeam: 'shot outcome team is inconsistent with the shot',
  goalOffTarget: 'a GOAL must follow an ON_TARGET shot',
  cardFoul: 'card foulEventId must reference a foul by the same player',
  manifest: (field: string) => `manifest ${field} does not match the events`,
} as const;
