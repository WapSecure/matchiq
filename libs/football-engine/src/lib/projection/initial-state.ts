import type { Fixture } from '@matchiq/contracts';
import type {
  DerivedState,
  FixtureContext,
  ProjectionState,
  Side,
  TeamTally,
  TeamTimeline,
} from '../types.js';

export const EMPTY_TALLY: TeamTally = {
  goals: 0,
  shots: 0,
  shotsOnTarget: 0,
  passesAttempted: 0,
  passesCompleted: 0,
  pressures: 0,
  recoveries: 0,
  highRecoveries: 0,
  finalThirdEntries: 0,
  fouls: 0,
  yellowCards: 0,
  redCards: 0,
  ownGoalsFor: 0,
  progressivePasses: 0,
  passDistanceSumM: 0,
  passDifficultySum: 0,
  geometryPasses: 0,
  shotSpeedSumKph: 0,
  shotSpeedMaxKph: 0,
  speedShots: 0,
  xgSum: 0,
};

export const EMPTY_TIMELINE: TeamTimeline = {
  shots: [],
  shotsOnTarget: [],
  pressures: [],
  recoveries: [],
  highRecoveries: [],
  finalThirdEntries: [],
};

export const INITIAL_DERIVED: DerivedState = {
  phase: 'NOT_STARTED',
  period: null,
  clockMs: 0,
  periodStartClockMs: 0,
  tallies: { home: EMPTY_TALLY, away: EMPTY_TALLY },
  timelines: { home: EMPTY_TIMELINE, away: EMPTY_TIMELINE },
  possession: {
    controlMs: { home: 0, away: 0 },
    contestedMs: 0,
    open: null,
    changeEvents: 0,
  },
  passAttempts: new Map(),
  completedAttempts: new Set(),
  progressiveAttempts: new Set(),
  passGeometry: new Map(),
  playerCounts: new Map(),
};

export const toFixtureContext = (fixture: Fixture): FixtureContext => ({
  fixtureId: fixture.fixtureId,
  teamIds: { home: fixture.home.teamId, away: fixture.away.teamId },
  teamNames: { home: fixture.home.name, away: fixture.away.name },
  pitch: fixture.pitch,
});

export const createInitialState = (fixture: Fixture): ProjectionState => ({
  fixture: toFixtureContext(fixture),
  ledger: [],
  sequences: new Set(),
  voided: new Set(),
  derived: INITIAL_DERIVED,
});

export const sideOf = (
  context: FixtureContext,
  teamId: string | null,
): Side | null => {
  if (teamId === context.teamIds.home) return 'home';
  if (teamId === context.teamIds.away) return 'away';
  return null;
};

export const opponentOf = (side: Side): Side =>
  side === 'home' ? 'away' : 'home';
