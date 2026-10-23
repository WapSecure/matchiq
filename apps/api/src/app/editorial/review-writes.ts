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
 * The cue as it airs: from now (or its slot start) for the requested time,
 * never past the slot the scheduler gave it, so it cannot air late.
 */
export const approvedCue = (
  row: ReviewCueRow,
  clock: SessionClock,
  overrides: ApprovalOverrides,
): OverlayCue => {
  const { cue } = row;
  const start = Math.max(cue.clockStartMs, clock.matchClockMs);
  const duration = overrides.durationMs ?? cue.clockEndMs - cue.clockStartMs;
  return {
    ...cue,
    revision: row.revision,
    priority: overrides.priority ?? cue.priority,
    clockStartMs: start,
    clockEndMs: Math.min(cue.clockEndMs, start + duration),
    status: 'APPROVED',
  };
};

/** False once the session clock has reached the end of the cue's slot. */
export const slotOpen = (
  row: ReviewCueRow,
  clock: SessionClock | null,
): clock is SessionClock =>
  clock !== null &&
  clock.period === row.period &&
  clock.matchClockMs < row.cue.clockEndMs;

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
