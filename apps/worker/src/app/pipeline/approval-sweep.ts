import { AUDIT_ACTIONS, SCHEMA_VERSION } from '@matchiq/contracts';
import {
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type ApprovalSweep,
  type AuditEntry,
  type FixtureKey,
  type StreamMessageDraft,
} from '@matchiq/db';
import { EDITORIAL_REASONS, OVERLAY_END_REASONS } from '../constants';
import type { OverlayEnd } from './pipeline-batch';

export interface SweepOutcome {
  readonly drafts: StreamMessageDraft[];
  readonly ends: OverlayEnd[];
  readonly audits: AuditEntry[];
}

/**
 * Closes what the clocks have run out (ADR-0023). A waiting cue whose
 * wall-clock window has passed lapses and never airs; an approved cue leaves
 * the screen once the match clock passes its own slot.
 */
export const sweepOutcome = (
  key: FixtureKey,
  sweep: ApprovalSweep,
  emittedAt: string,
): SweepOutcome => {
  const base = {
    schemaVersion: SCHEMA_VERSION,
    fixtureId: key.fixtureId,
    emittedAt,
  };
  const lapsedDrafts = sweep.lapsed.map(
    (cue) =>
      ({
        ...base,
        type: 'overlay.review',
        payload: {
          overlayId: cue.overlayId,
          ...(cue.insightId === null ? {} : { insightId: cue.insightId }),
          revision: cue.revision,
          state: 'APPROVAL_EXPIRED',
        },
      }) as StreamMessageDraft,
  );
  const dueDrafts = sweep.due.map(
    (cue) =>
      ({
        ...base,
        type: 'overlay.retract',
        payload: {
          overlayId: cue.overlayId,
          revision: cue.revision,
          reason: OVERLAY_END_REASONS.expired,
        },
      }) as StreamMessageDraft,
  );
  return {
    drafts: [...lapsedDrafts, ...dueDrafts],
    ends: [
      ...sweep.lapsed.map((cue) => ({
        overlayId: cue.overlayId,
        status: 'EXPIRED' as const,
        reason: EDITORIAL_REASONS.approvalWindow,
        editorial: {
          state: 'APPROVAL_EXPIRED' as const,
          reason: EDITORIAL_REASONS.approvalWindow,
        },
      })),
      ...sweep.due.map((cue) => ({
        overlayId: cue.overlayId,
        status: 'EXPIRED' as const,
        reason: OVERLAY_END_REASONS.expired,
      })),
    ],
    audits: sweep.lapsed.map((cue) => ({
      orgId: key.orgId,
      actorType: 'SYSTEM' as const,
      actor: AUDIT_ACTORS.overlayScheduler,
      action: AUDIT_ACTIONS.overlayApprovalExpired,
      targetType: AUDIT_TARGET_TYPES.overlay,
      targetId: cue.overlayId,
      fixtureId: key.fixtureId,
      reason: EDITORIAL_REASONS.approvalWindow,
      details: { revision: cue.revision, cause: 'WINDOW_LAPSED' },
    })),
  };
};
