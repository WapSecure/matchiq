import { z } from 'zod';
import { MESSAGES, PATTERNS } from './constants.js';
import {
  ConfidenceLabel,
  EventId,
  FixtureId,
  InsightId,
  MatchClockMs,
  MetricRef,
  Period,
  PlayerId,
  SchemaVersion,
  SemVer,
  TeamId,
  UtcTimestamp,
} from './primitives.js';

export const InsightKind = z.enum([
  'GOAL',
  'RED_CARD',
  'SHOT_BURST',
  'HIGH_REGAINS',
  'PRESSURE_SWING',
  'MOMENTUM_SHIFT',
  'PLAYER_MILESTONE',
]);

export const InsightPriority = z.enum(['P0', 'P1', 'P2']);

export const CounterEvidence = z.strictObject({
  description: z.string().min(1).max(200),
  eventIds: z.array(EventId),
});

export const EvidenceEnvelope = z
  .strictObject({
    insightId: InsightId,
    fixtureId: FixtureId,
    windowStartMs: MatchClockMs,
    windowEndMs: MatchClockMs,
    eventIds: z.array(EventId).min(1),
    computedMetrics: z.record(MetricRef, z.number()),
    methodVersion: SemVer,
    /** Fraction of expected event types present in the window, 0..1. */
    dataCoverage: z.number().min(0).max(1),
    confidenceLabel: ConfidenceLabel,
    rationale: z.string().min(1).max(400),
    counterEvidence: z.array(CounterEvidence),
    generatedAt: UtcTimestamp,
  })
  .refine((e) => e.windowEndMs >= e.windowStartMs, {
    path: ['windowEndMs'],
    message: MESSAGES.windowOrder,
  });

export const PipelineStatus = z.enum([
  'DETECTED',
  'ANALYZED',
  'DRAFTED',
  'VERIFIED',
  'SCHEDULED',
  'PUBLISHED',
  'REJECTED',
  'EXPIRED',
  'FALLBACK',
]);

export const Insight = z.strictObject({
  schemaVersion: SchemaVersion,
  insightId: InsightId,
  fixtureId: FixtureId,
  kind: InsightKind,
  priority: InsightPriority,
  /** `matchClockMs` restarts each period, so a moment is only placed by both. */
  period: Period,
  matchClockMs: MatchClockMs,
  teamId: TeamId.optional(),
  playerId: PlayerId.optional(),
  reasonCode: z.string().regex(PATTERNS.reasonCode),
  evidence: EvidenceEnvelope,
  status: PipelineStatus,
  synthetic: z.literal(true),
});

export type InsightKind = z.infer<typeof InsightKind>;
export type InsightPriority = z.infer<typeof InsightPriority>;
export type CounterEvidence = z.infer<typeof CounterEvidence>;
export type EvidenceEnvelope = z.infer<typeof EvidenceEnvelope>;
export type PipelineStatus = z.infer<typeof PipelineStatus>;
export type Insight = z.infer<typeof Insight>;
