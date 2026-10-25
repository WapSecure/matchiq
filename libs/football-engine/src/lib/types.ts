import type {
  MatchEvent,
  MatchPhase,
  PitchDimensions,
} from '@matchiq/contracts';

export type Side = 'home' | 'away';
export const SIDES: readonly Side[] = ['home', 'away'];

export interface FixtureContext {
  readonly fixtureId: string;
  readonly teamIds: Readonly<Record<Side, string>>;
  readonly teamNames: Readonly<Record<Side, string>>;
  readonly pitch: PitchDimensions;
}

export interface PassGeometry {
  readonly distanceM: number;
  readonly difficulty: number;
}

export interface TeamTally {
  readonly goals: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly passesAttempted: number;
  readonly passesCompleted: number;
  readonly pressures: number;
  readonly recoveries: number;
  readonly highRecoveries: number;
  readonly finalThirdEntries: number;
  readonly fouls: number;
  readonly yellowCards: number;
  readonly redCards: number;
  /** Own goals credited to this team; they are not from its shots. */
  readonly ownGoalsFor: number;
  /** Completed passes that advanced the ball at least PROGRESSIVE_PASS_MIN_GAIN. */
  readonly progressivePasses: number;
  /** Completed passes: summed metres, summed synthetic difficulty and the count. */
  readonly passDistanceSumM: number;
  readonly passDifficultySum: number;
  readonly geometryPasses: number;
  /** Shots carrying speedKph: sum, max and count. */
  readonly shotSpeedSumKph: number;
  readonly shotSpeedMaxKph: number;
  readonly speedShots: number;
  /** Sum of the geometric xG baseline over shots. */
  readonly xgSum: number;
}

/** Event kinds kept on a per-team timeline for windowed metrics and moments. */
export type TrackedKind =
  | 'shots'
  | 'shotsOnTarget'
  | 'pressures'
  | 'recoveries'
  | 'highRecoveries'
  | 'finalThirdEntries';

export const TRACKED_KINDS: readonly TrackedKind[] = [
  'shots',
  'shotsOnTarget',
  'pressures',
  'recoveries',
  'highRecoveries',
  'finalThirdEntries',
];

export interface TimelineEntry {
  readonly eventId: string;
  readonly sequence: number;
  readonly period: number;
  readonly clockMs: number;
}

export type TeamTimeline = Readonly<
  Record<TrackedKind, readonly TimelineEntry[]>
>;

export interface PossessionSegment {
  readonly owner: Side | null;
  readonly period: number;
  readonly startClockMs: number;
}

export interface PossessionState {
  /** Milliseconds of closed segments controlled by each side. */
  readonly controlMs: Readonly<Record<Side, number>>;
  /** Milliseconds of closed segments with `teamId: null` (contested or dead ball). */
  readonly contestedMs: number;
  readonly open: PossessionSegment | null;
  readonly changeEvents: number;
}

/** Aggregates derived by folding non-voided, non-correction events in sequence order. */
export interface DerivedState {
  readonly phase: MatchPhase;
  readonly period: number | null;
  readonly clockMs: number;
  readonly periodStartClockMs: number;
  readonly tallies: Readonly<Record<Side, TeamTally>>;
  readonly timelines: Readonly<Record<Side, TeamTimeline>>;
  readonly possession: PossessionState;
  /** PASS_ATTEMPTED eventId -> side; completions only count against these. */
  readonly passAttempts: ReadonlyMap<string, Side>;
  readonly completedAttempts: ReadonlySet<string>;
  /** PASS_ATTEMPTED eventIds whose target gains PROGRESSIVE_PASS_MIN_GAIN or more. */
  readonly progressiveAttempts: ReadonlySet<string>;
  /** PASS_ATTEMPTED eventId -> metres and synthetic difficulty, applied on completion. */
  readonly passGeometry: ReadonlyMap<string, PassGeometry>;
  /** Per-player counts keyed by `PLAYER_COUNT_KEYS` kind and player id. */
  readonly playerCounts: ReadonlyMap<string, number>;
}

export interface ProjectionState {
  readonly fixture: FixtureContext;
  /** Every accepted event (corrections included), sorted by sequence. */
  readonly ledger: readonly MatchEvent[];
  readonly sequences: ReadonlySet<number>;
  /** eventIds targeted by a CORRECTION (VOID) in the ledger. */
  readonly voided: ReadonlySet<string>;
  readonly derived: DerivedState;
}
