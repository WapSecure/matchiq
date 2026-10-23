import type {
  ContextSide,
  Insight,
  ScoreState,
  TrendDirection,
} from '@matchiq/contracts';
import type { TimelineEntry } from '../types.js';
import { roundTo } from '../util/numbers.js';
import {
  countBetween,
  matchMinute,
  matchMs,
  type ClockPoint,
} from './clock.js';
import { AVERAGE_DECIMALS, CONTEXT_WINDOWS } from './constants.js';

export interface ScoreFact {
  readonly state: ScoreState;
  readonly margin: number;
}

/** The scoreboard from `side`'s point of view. */
export const scoreFact = (
  goals: Readonly<Record<ContextSide, number>>,
  side: ContextSide,
): ScoreFact => {
  const mine = goals[side];
  const theirs = goals[side === 'home' ? 'away' : 'home'];
  const state: ScoreState =
    mine > theirs ? 'LEADING' : mine < theirs ? 'TRAILING' : 'LEVEL';
  return { state, margin: Math.abs(mine - theirs) };
};

export interface WindowFact {
  /** Count in the last `CONTEXT_WINDOWS.compareMinutes` minutes. */
  readonly recent: number;
  /** Match count so far per `compareMinutes` minutes, to one decimal. */
  readonly average: number;
}

/**
 * Last 10 minutes against the match rate so far, for one side's timeline;
 * null until 10 minutes have been played.
 */
export const windowFact = (
  entries: readonly TimelineEntry[],
  now: ClockPoint,
): WindowFact | null => {
  const windowMs = CONTEXT_WINDOWS.compareMinutes * CONTEXT_WINDOWS.minuteMs;
  const nowMs = matchMs(now);
  if (nowMs < windowMs) return null;
  const total = countBetween(entries, now, -1, nowMs);
  return {
    recent: countBetween(entries, now, nowMs - windowMs, nowMs),
    average: roundTo((total * windowMs) / nowMs, AVERAGE_DECIMALS),
  };
};

export interface TrendFact {
  /** Counts in the last three 5-minute spells, oldest first. */
  readonly spells: readonly number[];
  readonly direction: TrendDirection;
}

export const directionOf = (spells: readonly number[]): TrendDirection => {
  const steps = spells.slice(1).map((v, i) => v - (spells[i] ?? 0));
  if (steps.every((s) => s === 0)) return 'STEADY';
  if (steps.every((s) => s >= 0)) return 'RISING';
  if (steps.every((s) => s <= 0)) return 'FALLING';
  return 'MIXED';
};

/** Rising, falling, steady or mixed over the last three spells; null before 15 minutes. */
export const trendFact = (
  entries: readonly TimelineEntry[],
  now: ClockPoint,
): TrendFact | null => {
  const { spellMs, spells: count } = CONTEXT_WINDOWS;
  const nowMs = matchMs(now);
  if (nowMs < spellMs * count) return null;
  const spells = Array.from({ length: count }, (_, i) => {
    const endMs = nowMs - (count - 1 - i) * spellMs;
    return countBetween(entries, now, endMs - spellMs, endMs);
  });
  return { spells, direction: directionOf(spells) };
};

export interface RegainFact {
  readonly eventId: string;
  readonly secondsBefore: number;
}

/** The latest regain by the scoring side shortly before a goal, in the same period. */
export const precedingRegain = (
  recoveries: readonly TimelineEntry[],
  at: ClockPoint,
): RegainFact | null => {
  const candidates = recoveries.filter(
    (e) =>
      e.period === at.period &&
      e.clockMs <= at.clockMs &&
      at.clockMs - e.clockMs <= CONTEXT_WINDOWS.regainLookbackMs,
  );
  const latest = candidates.at(-1);
  if (latest === undefined) return null;
  return {
    eventId: latest.eventId,
    secondsBefore: Math.round((at.clockMs - latest.clockMs) / 1_000),
  };
};

export interface PreviousMomentFact {
  readonly insightId: string;
  readonly minute: number;
}

/** The previous moment of the same kind for the same team, if any. */
export const previousMoment = (
  prior: readonly Insight[],
  insight: Pick<Insight, 'insightId' | 'kind' | 'teamId'>,
): PreviousMomentFact | null => {
  const match = prior
    .filter(
      (p) =>
        p.insightId !== insight.insightId &&
        p.kind === insight.kind &&
        p.teamId === insight.teamId,
    )
    .at(-1);
  if (match === undefined) return null;
  return {
    insightId: match.insightId,
    minute: matchMinute({ period: match.period, clockMs: match.matchClockMs }),
  };
};
