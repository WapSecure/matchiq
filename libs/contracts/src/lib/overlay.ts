import { z } from 'zod';
import { LIMITS, MESSAGES } from './constants.js';
import {
  EventId,
  FixtureId,
  InsightId,
  Locale,
  MatchClockMs,
  MetricRef,
  OverlayId,
  Persona,
  SchemaVersion,
} from './primitives.js';

export const OverlayKind = z.enum([
  'SCORE_UPDATE',
  'KEY_MOMENT',
  'TACTICAL_INSIGHT',
  'STAT_COMPARISON',
  'DISCIPLINE',
  'SUBSTITUTION',
]);

export const OverlayStatus = z.enum([
  'DRAFT',
  'VERIFIED',
  'APPROVED',
  'AUTO_APPROVED',
  'SCHEDULED',
  'LIVE',
  'EXPIRED',
  'RETRACTED',
  'FAILED',
]);

export const OVERLAY_TRANSITIONS: Readonly<
  Record<
    z.infer<typeof OverlayStatus>,
    readonly z.infer<typeof OverlayStatus>[]
  >
> = {
  DRAFT: ['VERIFIED', 'FAILED', 'RETRACTED'],
  VERIFIED: ['APPROVED', 'AUTO_APPROVED', 'RETRACTED'],
  APPROVED: ['SCHEDULED', 'RETRACTED'],
  AUTO_APPROVED: ['SCHEDULED', 'RETRACTED'],
  SCHEDULED: ['LIVE', 'EXPIRED', 'RETRACTED'],
  LIVE: ['EXPIRED', 'RETRACTED'],
  EXPIRED: [],
  RETRACTED: [],
  FAILED: [],
};

export const canTransitionOverlay = (
  from: z.infer<typeof OverlayStatus>,
  to: z.infer<typeof OverlayStatus>,
): boolean => OVERLAY_TRANSITIONS[from].includes(to);

const inset = z.number().min(0).max(LIMITS.safeAreaMaxPct);

/** Percent insets from each edge of a 16:9 frame. */
export const SafeArea = z.strictObject({
  topPct: inset,
  rightPct: inset,
  bottomPct: inset,
  leftPct: inset,
});

export const OverlayCue = z
  .strictObject({
    schemaVersion: SchemaVersion,
    overlayId: OverlayId,
    fixtureId: FixtureId,
    insightId: InsightId.optional(),
    revision: z.int().positive(),
    kind: OverlayKind,
    priority: z.int().min(0).max(LIMITS.overlayPriorityMax),
    persona: Persona,
    locale: Locale,
    clockStartMs: MatchClockMs,
    clockEndMs: MatchClockMs,
    maxDisplayMs: z
      .int()
      .min(LIMITS.overlayMinDisplayMs)
      .max(LIMITS.overlayMaxDisplayMs),
    headline: z.string().min(1).max(LIMITS.overlayHeadlineMax),
    body: z.string().max(LIMITS.overlayBodyMax),
    evidenceEventIds: z.array(EventId).min(1),
    metricRefs: z.array(MetricRef),
    safeArea: SafeArea,
    status: OverlayStatus,
    synthetic: z.literal(true),
  })
  .superRefine((cue, ctx) => {
    const duration = cue.clockEndMs - cue.clockStartMs;
    if (duration <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['clockEndMs'],
        message: MESSAGES.overlayOrder,
      });
    } else if (duration > cue.maxDisplayMs) {
      ctx.addIssue({
        code: 'custom',
        path: ['clockEndMs'],
        message: MESSAGES.overlayTooLong,
      });
    }
  });

export type OverlayKind = z.infer<typeof OverlayKind>;
export type OverlayStatus = z.infer<typeof OverlayStatus>;
export type SafeArea = z.infer<typeof SafeArea>;
export type OverlayCue = z.infer<typeof OverlayCue>;
