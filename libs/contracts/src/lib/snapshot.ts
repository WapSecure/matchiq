import { z } from 'zod';
import { PATTERNS } from './constants.js';
import {
  FixtureId,
  MatchClockMs,
  MetricRef,
  Period,
  SchemaVersion,
  SemVer,
} from './primitives.js';

export const MetricUnavailableReason = z.enum([
  'ZERO_DENOMINATOR',
  'NO_TRACKING_DATA',
  'NOT_GENERATED',
  'INSUFFICIENT_SAMPLE',
]);

export const MetricUnit = z.enum([
  'count',
  'percent',
  'index',
  'metres',
  'kph',
  'mps',
]);

export const MetricValue = z
  .discriminatedUnion('status', [
    z
      .strictObject({
        status: z.literal('available'),
        value: z.number(),
        unit: MetricUnit,
        numerator: z.number().optional(),
        denominator: z.number().optional(),
      })
      .meta({ id: 'MetricAvailable' }),
    z
      .strictObject({
        status: z.literal('unavailable'),
        reason: MetricUnavailableReason,
      })
      .meta({ id: 'MetricUnavailable' }),
  ])
  .meta({ id: 'MetricValue' });

export const PossessionBasis = z.enum(['TIME_WEIGHTED', 'EVENT_SHARE_PROXY']);

export const TeamMatchMetrics = z
  .strictObject({
    goals: z.int().nonnegative(),
    shots: z.int().nonnegative(),
    shotsOnTarget: z.int().nonnegative(),
    passesAttempted: z.int().nonnegative(),
    passesCompleted: z.int().nonnegative(),
    passCompletionPct: MetricValue,
    /** Optional so snapshots stored before algorithm 1.1.0 still parse. */
    shotConversionPct: MetricValue.optional(),
    passQualityPct: MetricValue.optional(),
    possessionPct: MetricValue,
    possessionBasis: PossessionBasis,
    pressures: z.int().nonnegative(),
    recoveries: z.int().nonnegative(),
    finalThirdEntries: z.int().nonnegative(),
    fouls: z.int().nonnegative(),
    yellowCards: z.int().nonnegative(),
    redCards: z.int().nonnegative(),
    momentum: MetricValue,
  })
  .meta({ id: 'TeamMatchMetrics' });

export const MatchPhase = z.enum([
  'NOT_STARTED',
  'IN_PLAY',
  'BREAK',
  'COMPLETED',
]);

export const MatchSnapshot = z.strictObject({
  schemaVersion: SchemaVersion,
  fixtureId: FixtureId,
  throughSequence: z.int().min(-1),
  algorithmVersion: SemVer,
  phase: MatchPhase,
  period: Period.nullable(),
  matchClockMs: MatchClockMs,
  score: z.strictObject({
    home: z.int().nonnegative(),
    away: z.int().nonnegative(),
  }),
  home: TeamMatchMetrics,
  away: TeamMatchMetrics,
  /** Set when a sequence gap or pending correction makes the state incomplete. */
  provisional: z.boolean(),
  stateHash: z.string().regex(PATTERNS.sha256Hex),
});

export const MetricDefinition = z.strictObject({
  metricRef: MetricRef,
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  formula: z.string().min(1).max(200),
  unit: MetricUnit,
  windowMs: z.int().positive().optional(),
  algorithmVersion: SemVer,
  heuristic: z.boolean(),
});

export type MetricUnavailableReason = z.infer<typeof MetricUnavailableReason>;
export type MetricUnit = z.infer<typeof MetricUnit>;
export type MetricValue = z.infer<typeof MetricValue>;
export type PossessionBasis = z.infer<typeof PossessionBasis>;
export type TeamMatchMetrics = z.infer<typeof TeamMatchMetrics>;
export type MatchPhase = z.infer<typeof MatchPhase>;
export type MatchSnapshot = z.infer<typeof MatchSnapshot>;
export type MetricDefinition = z.infer<typeof MetricDefinition>;
