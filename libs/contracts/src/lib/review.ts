import { z } from 'zod';
import { LIMITS, MESSAGES } from './constants.js';
import { EditorialReason, PublishPolicy } from './editorial.js';
import { OverlayCue } from './overlay.js';
import {
  FixtureId,
  InsightId,
  MatchClockMs,
  OverlayId,
  UtcTimestamp,
} from './primitives.js';
import { OverlayEditorialState } from './reads.js';

/** Approve-before-air (spec §29, §31.4, §45; ADR-0024). */
export const ReviewDecision = z.enum(['APPROVE', 'REJECT']);

export const OverlayReviewState = OverlayEditorialState.extract([
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'APPROVAL_EXPIRED',
]);

export const ReviewDurationMs = z
  .int()
  .min(LIMITS.overlayMinDisplayMs)
  .max(LIMITS.overlayMaxDisplayMs);

export const ReviewPriority = z.int().min(0).max(LIMITS.overlayPriorityMax);

/** `POST /insights/:insightId/review`. Overrides apply to an approval only. */
export const ReviewInsightCommand = z
  .strictObject({
    decision: ReviewDecision,
    reason: EditorialReason.optional(),
    /** The cue revision the producer saw; a newer one answers 409. */
    revision: z.int().positive().optional(),
    /** How long the cue stays up, capped by the time left in its slot. */
    durationMs: ReviewDurationMs.optional(),
    priority: ReviewPriority.optional(),
  })
  .refine(
    (c) =>
      c.decision === 'APPROVE' ||
      (c.durationMs === undefined && c.priority === undefined),
    { path: ['decision'], message: MESSAGES.reviewOverrides },
  );

export const ReviewInsightResult = z.strictObject({
  insightId: InsightId,
  overlayId: OverlayId,
  fixtureId: FixtureId,
  revision: z.int().positive(),
  state: OverlayReviewState,
  /** False when the cue was already in the requested state: nothing was written. */
  changed: z.boolean(),
  auditId: z.uuid().nullable(),
  /** The cue as it went on air; null for a rejection or a repeat. */
  cue: OverlayCue.nullable(),
});

/** One cue waiting for a producer, with the copy it would air. */
export const OverlayReview = z.strictObject({
  overlayId: OverlayId,
  insightId: InsightId.nullable(),
  fixtureId: FixtureId,
  revision: z.int().positive(),
  state: OverlayReviewState,
  cue: OverlayCue,
  period: z.int().positive(),
  /** Match clock at which its slot closes; it never airs after this. */
  expiresAtClockMs: MatchClockMs,
  waitingSince: UtcTimestamp,
});

/** `GET /fixtures/:id/overlay-reviews`: bounded by the single on-air slot. */
export const OverlayReviewList = z.strictObject({
  items: z.array(OverlayReview).max(LIMITS.reviewQueueMax),
});

export const SetPublishPolicyCommand = z.strictObject({
  policy: PublishPolicy,
  reason: EditorialReason,
});

/** `overlay.review` frame: carries no copy, since the stream is public. */
export const OverlayReviewNotice = z.strictObject({
  overlayId: OverlayId,
  insightId: InsightId.optional(),
  revision: z.int().positive(),
  state: OverlayReviewState,
});

export type ReviewDecision = z.infer<typeof ReviewDecision>;
export type OverlayReviewState = z.infer<typeof OverlayReviewState>;
export type ReviewInsightCommand = z.infer<typeof ReviewInsightCommand>;
export type ReviewInsightResult = z.infer<typeof ReviewInsightResult>;
export type OverlayReview = z.infer<typeof OverlayReview>;
export type OverlayReviewList = z.infer<typeof OverlayReviewList>;
export type SetPublishPolicyCommand = z.infer<typeof SetPublishPolicyCommand>;
export type OverlayReviewNotice = z.infer<typeof OverlayReviewNotice>;
