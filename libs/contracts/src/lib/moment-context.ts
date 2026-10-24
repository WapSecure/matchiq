import { z } from 'zod';
import { EventId, InsightId, MetricRef, SemVer } from './primitives.js';

/** The subject side's position on the scoreboard at the moment. */
export const ScoreState = z.enum(['LEADING', 'LEVEL', 'TRAILING']);

/** Where in the match the moment falls; FINAL_15 covers the last 15 minutes of normal time on. */
export const MinutePhase = z.enum([
  'EARLY',
  'FIRST_HALF',
  'BEFORE_HALF_TIME',
  'SECOND_HALF',
  'FINAL_15',
]);

export const TrendDirection = z.enum(['RISING', 'FALLING', 'STEADY', 'MIXED']);

/** Event counts the engine keeps on each team timeline. */
export const ContextMetric = z.enum([
  'shots',
  'shotsOnTarget',
  'pressures',
  'recoveries',
  'highRecoveries',
  'finalThirdEntries',
]);

export const ContextSide = z.enum(['home', 'away']);

/**
 * Deterministic context for one key moment (MQ-068). Every number lives in
 * `metrics` under a fixed `context.*` ref (`CONTEXT_REFS`), so agents and the
 * publish gate cite it exactly like `computedMetrics`.
 */
export const MomentContext = z
  .strictObject({
    methodVersion: SemVer,
    side: ContextSide,
    scoreState: ScoreState,
    phase: MinutePhase,
    /** The last 10 minutes against the match average per 10 minutes, both sides. */
    comparison: z.strictObject({ metric: ContextMetric }).nullable(),
    /** The subject's count in each of the last three 5-minute spells, oldest first. */
    trend: z
      .strictObject({ metric: ContextMetric, direction: TrendDirection })
      .nullable(),
    linked: z.strictObject({
      /** The subject's regain that started the move, for a goal. */
      regainEventId: EventId.optional(),
      /** The previous moment of the same kind for the same side. */
      previousInsightId: InsightId.optional(),
    }),
    /** Linked events, citable alongside the evidence envelope's. */
    eventIds: z.array(EventId),
    metrics: z.record(MetricRef, z.number()),
  })
  .meta({ id: 'MomentContext' });

/** Fixed `context.*` metric refs; the agents service mirrors these names. */
export const CONTEXT_REFS = {
  scoreHome: 'context.score.home',
  scoreAway: 'context.score.away',
  margin: 'context.score.margin',
  minute: 'context.minute',
  windowMinutes: 'context.compare.windowMinutes',
  recent: (side: ContextSide) => `context.compare.recent.${side}`,
  average: (side: ContextSide) => `context.compare.average.${side}`,
  spells: [
    'context.trend.spell1',
    'context.trend.spell2',
    'context.trend.spell3',
  ],
  regainSeconds: 'context.linked.regainSeconds',
  previousMinute: 'context.linked.previousMinute',
} as const;

export type ScoreState = z.infer<typeof ScoreState>;
export type MinutePhase = z.infer<typeof MinutePhase>;
export type TrendDirection = z.infer<typeof TrendDirection>;
export type ContextMetric = z.infer<typeof ContextMetric>;
export type ContextSide = z.infer<typeof ContextSide>;
export type MomentContext = z.infer<typeof MomentContext>;
