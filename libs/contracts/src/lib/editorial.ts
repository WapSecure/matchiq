import { z } from 'zod';
import { LIMITS } from './constants.js';
import {
  EventId,
  FixtureId,
  InsightId,
  OverlayId,
  UtcTimestamp,
} from './primitives.js';

/** Free-text justification recorded in the audit trail; never shown to viewers. */
export const EditorialReason = z
  .string()
  .trim()
  .min(LIMITS.editorialReasonMin)
  .max(LIMITS.editorialReasonMax);

export const EditorialCommand = z.strictObject({ reason: EditorialReason });

/**
 * Why a cue left the air. Producer, suppression and kill-switch causes are
 * editorial; CORRECTION means its moment no longer holds after a correction.
 */
export const OverlayRetractCause = z.enum([
  'EXPIRED',
  'SUPERSEDED',
  'PERIOD_ENDED',
  'MATCH_ENDED',
  'PRODUCER',
  'INSIGHT_SUPPRESSED',
  'KILL_SWITCH',
  'CORRECTION',
]);

/** CORRECTION: a VOID removed its evidence. LATE_EVENT: an out-of-order event changed it. */
export const InsightRetractCause = z.enum(['CORRECTION', 'LATE_EVENT']);

/** `insight.retract`: a key moment that no longer holds on the corrected ledger (ADR-0013). */
export const InsightRetraction = z.strictObject({
  insightId: InsightId,
  cause: InsightRetractCause,
  /** The CORRECTION (or late event) whose re-detection dropped the moment. */
  causeEventId: EventId,
  reason: z.string().min(1).max(LIMITS.retractReasonMax),
});

/**
 * Effective on-air policy for one fixture: `AUTO` publishes gated cues,
 * `FROZEN` (session freeze) and `KILLED` (organisation kill switch) hold them.
 */
export const EditorialMode = z.enum(['AUTO', 'FROZEN', 'KILLED']);

export const EditorialControl = z.strictObject({
  active: z.boolean(),
  changedAt: UtcTimestamp.nullable(),
});

/** Public view: carries no actor or reason, which stay in the audit trail. */
export const EditorialStatus = z.strictObject({
  fixtureId: FixtureId,
  mode: EditorialMode,
  freeze: EditorialControl,
  killSwitch: EditorialControl,
});

export const EditorialStatusResult = z.strictObject({
  status: EditorialStatus,
  /** False when the control was already in the requested state: nothing was written. */
  changed: z.boolean(),
  auditId: z.uuid().nullable(),
});

export const KillSwitchStatus = z.strictObject({
  killSwitch: EditorialControl,
});

export const KillSwitchResult = z.strictObject({
  killSwitch: EditorialControl,
  changed: z.boolean(),
  auditId: z.uuid().nullable(),
  /** Active sessions notified with `editorial.status`. */
  fixtureIds: z.array(FixtureId),
  /** Cues taken off air by the activation. */
  retractedOverlayIds: z.array(OverlayId),
});

export const RetractOverlayResult = z.strictObject({
  overlayId: OverlayId,
  fixtureId: FixtureId,
  revision: z.int().positive(),
  status: z.literal('RETRACTED'),
  changed: z.boolean(),
  auditId: z.uuid().nullable(),
});

export const SuppressInsightResult = z.strictObject({
  insightId: InsightId,
  fixtureId: FixtureId,
  status: z.literal('REJECTED'),
  changed: z.boolean(),
  auditId: z.uuid().nullable(),
  /** The insight's cue, when it was on air and was retracted with it. */
  retractedOverlayId: OverlayId.nullable(),
});

export type EditorialReason = z.infer<typeof EditorialReason>;
export type EditorialCommand = z.infer<typeof EditorialCommand>;
export type OverlayRetractCause = z.infer<typeof OverlayRetractCause>;
export type InsightRetractCause = z.infer<typeof InsightRetractCause>;
export type InsightRetraction = z.infer<typeof InsightRetraction>;
export type EditorialMode = z.infer<typeof EditorialMode>;
export type EditorialControl = z.infer<typeof EditorialControl>;
export type EditorialStatus = z.infer<typeof EditorialStatus>;
export type EditorialStatusResult = z.infer<typeof EditorialStatusResult>;
export type KillSwitchStatus = z.infer<typeof KillSwitchStatus>;
export type KillSwitchResult = z.infer<typeof KillSwitchResult>;
export type RetractOverlayResult = z.infer<typeof RetractOverlayResult>;
export type SuppressInsightResult = z.infer<typeof SuppressInsightResult>;
