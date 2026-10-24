import {
  AUDIT_ACTIONS,
  type OverlayCue,
  type OverlayReviewState,
} from '@matchiq/contracts';
import type {
  EditorialTransaction,
  FixtureKey,
  OverlayRow,
  ReviewCueRow,
  SessionClock,
  StreamMessageDraft,
} from '@matchiq/db';
import { AUDIT_TARGETS } from '../constants';
import { auditOf, draft, type RequestContext } from './editorial-writes';

export type ReviewContext = RequestContext & { readonly reason?: string };

type CueRef = Pick<OverlayRow, 'overlayId' | 'insightId' | 'revision'>;

/** On air: a live cue that aired automatically or with a producer's approval. */
export const isOnAir = (overlay: OverlayRow): boolean =>
  overlay.status === 'LIVE' &&
  (overlay.editorialState === null || overlay.editorialState === 'APPROVED');

/** `overlay.review` carries ids and state only: the stream is public. */
export const reviewDraft = (
  key: FixtureKey,
  now: string,
  cue: CueRef,
  state: OverlayReviewState,
): StreamMessageDraft =>
  draft(key.fixtureId, now, {
    type: 'overlay.review',
    payload: {
      overlayId: cue.overlayId,
      ...(cue.insightId === null ? {} : { insightId: cue.insightId }),
      revision: cue.revision,
      state,
    },
  });

export interface ApprovalOverrides {
  readonly durationMs?: number;
  readonly priority?: number;
}

/**
 * The cue as it airs: from the current match clock for its normal duration (or
 * the producer's), so a producer's wall-clock decision never airs a cue late.
 */
export const approvedCue = (
  row: ReviewCueRow,
  clock: SessionClock,
  overrides: ApprovalOverrides,
): OverlayCue => {
  const { cue } = row;
  const duration = Math.min(
    overrides.durationMs ?? cue.clockEndMs - cue.clockStartMs,
    cue.maxDisplayMs,
  );
  return {
    ...cue,
    revision: row.revision,
    priority: overrides.priority ?? cue.priority,
    clockStartMs: clock.matchClockMs,
    clockEndMs: clock.matchClockMs + duration,
    status: 'APPROVED',
  };
};

/** False once the cue's wall-clock approval window has passed (ADR-0024). */
export const windowOpen = (
  row: ReviewCueRow,
  clock: SessionClock | null,
  now: string,
): clock is SessionClock =>
  clock !== null &&
  row.approvalDeadline !== null &&
  row.approvalDeadline.toISOString() > now;

export interface CloseReviewInput {
  readonly key: FixtureKey;
  readonly overlay: CueRef;
  readonly now: string;
  readonly cause: 'PRODUCER' | 'INSIGHT_SUPPRESSED';
}

/** Rejects a waiting cue: it never airs. Returns the audit id. */
export const rejectInTx = async (
  tx: EditorialTransaction,
  input: CloseReviewInput,
  ctx: ReviewContext,
): Promise<string> => {
  const { key, overlay } = input;
  await tx.markOverlay(key, overlay.overlayId, {
    status: 'RETRACTED',
    state: 'REJECTED',
    reason: ctx.reason ?? null,
  });
  await tx.appendStreamMessages(key, [
    reviewDraft(key, input.now, overlay, 'REJECTED'),
  ]);
  return tx.appendAudit(
    auditOf(ctx, {
      action: AUDIT_ACTIONS.overlayRejected,
      targetType: AUDIT_TARGETS.overlay,
      targetId: overlay.overlayId,
      fixtureId: key.fixtureId,
      before: { state: 'AWAITING_APPROVAL', revision: overlay.revision },
      after: { state: 'REJECTED', revision: overlay.revision },
      details: { cause: input.cause, insightId: overlay.insightId },
    }),
  );
};
