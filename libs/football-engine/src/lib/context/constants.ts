import type { ContextMetric, InsightKind } from '@matchiq/contracts';

/** Bump on any change that can alter a `MomentContext` value. */
export const CONTEXT_METHOD_VERSION = '1.0.0';

const MINUTE_MS = 60_000;

/** Minutes played before each period starts, and its nominal length. */
export const PERIOD_CLOCK: Readonly<
  Record<number, { offsetMin: number; lengthMin: number }>
> = {
  1: { offsetMin: 0, lengthMin: 45 },
  2: { offsetMin: 45, lengthMin: 45 },
  3: { offsetMin: 90, lengthMin: 15 },
  4: { offsetMin: 105, lengthMin: 15 },
  5: { offsetMin: 120, lengthMin: 0 },
};

export const CONTEXT_WINDOWS = {
  minuteMs: MINUTE_MS,
  compareMinutes: 10,
  spellMs: 5 * MINUTE_MS,
  spells: 3,
  /** A regain at most this long before a goal is linked to it. */
  regainLookbackMs: 45_000,
} as const;

/** Phase boundaries in match minutes (1-based, as on a scoreboard). */
export const PHASE_MINUTES = {
  earlyMax: 15,
  beforeHalfTimeMin: 36,
  finalMin: 76,
} as const;

export const AVERAGE_DECIMALS = 1;

/** The count each moment's comparison and trend describe. */
export const KEY_METRIC: Readonly<Record<InsightKind, ContextMetric>> = {
  GOAL: 'shots',
  RED_CARD: 'shots',
  SHOT_BURST: 'shots',
  HIGH_REGAINS: 'highRecoveries',
  PRESSURE_SWING: 'pressures',
  MOMENTUM_SHIFT: 'pressures',
  PLAYER_MILESTONE: 'shots',
};
