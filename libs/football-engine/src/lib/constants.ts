/** Bump on any change that can alter a snapshot value or `stateHash`. */
export const ALGORITHM_VERSION = '1.0.0';
/** Bump on any change to key-moment rules, thresholds or evidence wording. */
export const MOMENT_METHOD_VERSION = '1.0.0';

/** Sequences are gap-free from 0 per fixture (`ReplayStatus.appliedSequence` starts at -1). */
export const FIRST_SEQUENCE = 0;
export const NO_SEQUENCE = -1;

const MINUTE_MS = 60_000;

export const WINDOWS = {
  rollingMs: 5 * MINUTE_MS,
  /** Momentum is unavailable until this much of the current period has elapsed. */
  momentumMinElapsedMs: 2 * MINUTE_MS,
  debounceMs: 5 * MINUTE_MS,
} as const;

/** Recoveries at or beyond this x (acting team's attacking direction) count as high. */
export const HIGH_RECOVERY_MIN_X = 60;

export const ROUNDING = {
  percentDecimals: 1,
  indexDecimals: 2,
  coverageDecimals: 2,
} as const;

export const PERCENT = 100;

/**
 * Spec §9 momentum weights. Each component is a bounded z-score against a
 * fixed reference scale (per 5-minute window), so the index never depends on
 * data outside the window and is identical on every replay.
 */
export const MOMENTUM_WEIGHTS = {
  shots: 0.35,
  finalThirdEntries: 0.25,
  pressures: 0.2,
  highRecoveries: 0.2,
} as const;

/**
 * Reference mean and standard deviation per team per 5 minutes. These are
 * product calibration constants for synthetic fixtures, not league statistics.
 */
export const MOMENTUM_REFERENCE = {
  shots: { mean: 0.7, sd: 0.8 },
  finalThirdEntries: { mean: 4, sd: 2.5 },
  pressures: { mean: 8, sd: 4 },
  highRecoveries: { mean: 1.5, sd: 1.2 },
} as const;

export const MOMENTUM_Z_BOUND = 3;
/** Fewer contributing events (both teams) than this in the window gives INSUFFICIENT_SAMPLE. */
export const MOMENTUM_MIN_EVENTS = 3;

export const MOMENT_THRESHOLDS = {
  shotBurstMinShots: 3,
  highRegainsMinRecoveries: 3,
  /** Pressure swing: team pressures now vs the previous comparable window. */
  pressureSwingMinDelta: 5,
  pressureSwingMinCount: 8,
  /** Momentum shift on the home-minus-away (or reverse) momentum differential. */
  momentumShiftMinDelta: 1.5,
  momentumShiftMinLead: 1,
} as const;

export const CONFIDENCE_RULES = {
  highMinCoverage: 0.8,
  highMinSample: 8,
  mediumMinCoverage: 0.5,
  mediumMinSample: 4,
} as const;

/** Event types whose presence in a window defines `dataCoverage`. */
export const COVERAGE_EVENT_TYPES = [
  'PASS_ATTEMPTED',
  'POSSESSION_CHANGED',
  'SHOT',
  'PRESSURE_APPLIED',
  'RECOVERY',
  'FINAL_THIRD_ENTRY',
] as const;

export const REASON_CODES = {
  goal: 'GOAL_SCORED',
  ownGoal: 'OWN_GOAL_SCORED',
  redCard: 'RED_CARD_SHOWN',
  secondYellow: 'SECOND_YELLOW_DISMISSAL',
  shotBurst: 'SHOT_BURST_THRESHOLD',
  highRegains: 'HIGH_REGAINS_THRESHOLD',
  pressureSwing: 'PRESSURE_SWING_THRESHOLD',
  momentumShift: 'MOMENTUM_SHIFT_THRESHOLD',
} as const;

export const ERRORS = {
  wrongFixture: (expected: string, actual: string) =>
    `event for fixture ${actual} applied to projection of ${expected}`,
} as const;

/** Metric-ref suffixes: `<metric>.<side>.<suffix>` (see `MetricRef` in contracts). */
export const WINDOW_SUFFIX = {
  current: 'rolling5m',
  previous: 'previous5m',
} as const;

export const INSIGHT_ID_PREFIX = 'in_';
export const INSIGHT_ID_HASH_LENGTH = 24;
