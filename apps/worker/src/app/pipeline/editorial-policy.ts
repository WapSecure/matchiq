import {
  AUDIT_ACTIONS,
  type OverlayCue,
  type OverlayReviewState,
  type StreamMessageOf,
} from '@matchiq/contracts';
import {
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type AuditEntry,
  type EditorialView,
  type FixtureKey,
  type OverlayEditorialState,
  type OverlayRecord,
  type StreamMessageDraft,
} from '@matchiq/db';
import {
  DEFAULT_APPROVAL_WINDOW_MS,
  EDITORIAL_REASONS,
  OVERLAY_END_REASONS,
} from '../constants';
import type { OverlayEnd, PipelineBatch } from './pipeline-batch';

export { editorialIds, gateAudits } from './policy-audits';

/** Wall-clock input for MANUAL: a waiting cue lapses `windowMs` after `nowMs`. */
export interface ApprovalTiming {
  readonly nowMs: number;
  readonly windowMs: number;
}

export interface EditorialOutcome {
  readonly batch: PipelineBatch;
  readonly audits: AuditEntry[];
}

type Publish = StreamMessageOf<'overlay.publish'>['payload'];
type Retract = StreamMessageOf<'overlay.retract'>['payload'];
type Drafts = StreamMessageDraft[];

const recordKey = (cue: Pick<OverlayCue, 'overlayId' | 'revision'>) =>
  `${cue.overlayId}#${cue.revision}`;

/** `overlay.review` in place of the draft it stands for, with no copy. */
const notice = (
  draft: StreamMessageDraft,
  cue: { overlayId: string; revision: number; insightId?: string },
  state: OverlayReviewState,
): StreamMessageDraft => ({
  schemaVersion: draft.schemaVersion,
  fixtureId: draft.fixtureId,
  emittedAt: draft.emittedAt,
  type: 'overlay.review',
  payload: {
    overlayId: cue.overlayId,
    ...(cue.insightId === undefined ? {} : { insightId: cue.insightId }),
    revision: cue.revision,
    state,
  },
});

/** Ends that close a cue's flow at once: a ruled-out moment or the final whistle. */
const FINAL_END_REASONS: ReadonlySet<string> = new Set([
  OVERLAY_END_REASONS.corrected,
  OVERLAY_END_REASONS.matchEnded,
]);

class PolicyRun {
  readonly audits: AuditEntry[] = [];
  private readonly states: Map<string, OverlayEditorialState>;
  private readonly dropped = new Set<string>();
  private readonly held = new Map<string, OverlayRecord['editorial']>();
  private readonly endsDropped = new Set<string>();
  private readonly lapsed = new Set<string>();

  constructor(
    private readonly key: FixtureKey,
    private readonly view: EditorialView,
    private readonly timing: ApprovalTiming,
  ) {
    this.states = new Map(view.overlays);
  }

  publish(draft: StreamMessageDraft, cue: Publish): Drafts {
    const state = this.states.get(cue.overlayId);
    if (state === 'AWAITING_APPROVAL') return this.await(draft, cue, false);
    if (state !== undefined) {
      const reason =
        state === 'APPROVED'
          ? EDITORIAL_REASONS.approved
          : EDITORIAL_REASONS.offAir;
      return this.block(cue, reason);
    }
    if (cue.insightId && this.view.suppressedInsights.has(cue.insightId)) {
      return this.hold(cue, 'SUPPRESSED', EDITORIAL_REASONS.suppressed);
    }
    if (this.view.mode !== 'AUTO') {
      const reason = EDITORIAL_REASONS[this.view.mode];
      // A cue already on air keeps its stored row: only its new revision is withheld.
      if (this.view.aired.has(cue.overlayId)) return this.block(cue, reason);
      return this.hold(cue, 'HELD', reason);
    }
    if (this.view.publishPolicy === 'AUTO') return [draft];
    if (this.view.aired.has(cue.overlayId)) {
      return this.block(cue, EDITORIAL_REASONS.manualRevision);
    }
    return this.await(draft, cue, true);
  }

  /**
   * A scheduler end. A cue in the manual flow stays where it is: its approval
   * window runs on the wall clock, and an approved cue is ended by the sweep
   * once the match clock passes the slot it was approved into.
   */
  retract(draft: StreamMessageDraft, payload: Retract): Drafts {
    const state = this.states.get(payload.overlayId);
    const inFlow = state === 'AWAITING_APPROVAL' || state === 'APPROVED';
    if (inFlow && !FINAL_END_REASONS.has(payload.reason)) {
      this.endsDropped.add(payload.overlayId);
      return [];
    }
    if (state === 'AWAITING_APPROVAL') return this.lapse(draft, payload);
    if (state !== undefined && state !== 'APPROVED') {
      this.endsDropped.add(payload.overlayId);
      return [];
    }
    if (payload.reason === OVERLAY_END_REASONS.superseded) {
      this.audit(payload.overlayId, AUDIT_ACTIONS.overlayRetracted, {
        actor: AUDIT_ACTORS.overlayScheduler,
        reason: payload.reason,
        details: { revision: payload.revision, cause: 'SUPERSEDED' },
      });
    }
    return [draft];
  }

  overlays(records: readonly OverlayRecord[]): OverlayRecord[] {
    return records.flatMap((record) => {
      const key = recordKey(record.cue);
      if (this.dropped.has(key)) return [];
      const editorial = this.held.get(key);
      if (editorial === undefined) return [record];
      return [
        {
          ...record,
          cue: { ...record.cue, status: 'VERIFIED' },
          status: 'VERIFIED',
          editorial,
        },
      ];
    });
  }

  ends(ends: readonly OverlayEnd[]): OverlayEnd[] {
    return ends.flatMap((end) => {
      if (this.endsDropped.has(end.overlayId)) return [];
      if (!this.lapsed.has(end.overlayId)) return [end];
      const editorial = {
        state: 'APPROVAL_EXPIRED' as const,
        reason: end.reason,
      };
      return [{ ...end, status: 'EXPIRED' as const, editorial }];
    });
  }

  /** MANUAL: stored with its copy and wall-clock window, announced without copy (ADR-0024). */
  private await(
    draft: StreamMessageDraft,
    cue: Publish,
    fresh: boolean,
  ): Drafts {
    this.states.set(cue.overlayId, 'AWAITING_APPROVAL');
    const reason = EDITORIAL_REASONS.awaitingApproval;
    // A new revision keeps the window its first copy opened.
    const approvalDeadline = fresh
      ? { approvalDeadline: new Date(this.timing.nowMs + this.timing.windowMs) }
      : {};
    this.held.set(recordKey(cue), {
      state: 'AWAITING_APPROVAL',
      reason,
      ...approvalDeadline,
    });
    this.audit(cue.overlayId, AUDIT_ACTIONS.overlayAwaitingApproval, {
      actor: AUDIT_ACTORS.publishGate,
      reason,
      details: { revision: cue.revision, insightId: cue.insightId ?? null },
    });
    return [notice(draft, cue, 'AWAITING_APPROVAL')];
  }

  /** The moment was ruled out or the match ended before a producer approved it. */
  private lapse(draft: StreamMessageDraft, payload: Retract): Drafts {
    this.states.set(payload.overlayId, 'APPROVAL_EXPIRED');
    this.lapsed.add(payload.overlayId);
    this.audit(payload.overlayId, AUDIT_ACTIONS.overlayApprovalExpired, {
      actor: AUDIT_ACTORS.overlayScheduler,
      reason: payload.reason,
      details: { revision: payload.revision },
    });
    return [notice(draft, payload, 'APPROVAL_EXPIRED')];
  }

  private hold(cue: Publish, state: OverlayEditorialState, reason: string) {
    this.states.set(cue.overlayId, state);
    this.held.set(recordKey(cue), { state, reason });
    this.audit(cue.overlayId, AUDIT_ACTIONS.overlayHeld, {
      actor: AUDIT_ACTORS.publishGate,
      reason,
      details: { revision: cue.revision, insightId: cue.insightId ?? null },
    });
    return [];
  }

  private block(cue: Publish, reason: string): Drafts {
    this.dropped.add(recordKey(cue));
    this.audit(cue.overlayId, AUDIT_ACTIONS.overlayBlocked, {
      actor: AUDIT_ACTORS.publishGate,
      reason,
      details: { revision: cue.revision, insightId: cue.insightId ?? null },
    });
    return [];
  }

  private audit(
    overlayId: string,
    action: string,
    entry: Pick<AuditEntry, 'actor' | 'reason' | 'details'>,
  ) {
    this.audits.push({
      orgId: this.key.orgId,
      actorType: 'SYSTEM',
      action,
      targetType: AUDIT_TARGET_TYPES.overlay,
      targetId: overlayId,
      fixtureId: this.key.fixtureId,
      ...entry,
    });
  }
}

/**
 * The editorial stage after the deterministic scheduler (spec §44, §46): the
 * scheduler's decisions stay a pure function of the event stream, and this
 * filter decides what actually goes on air given producer state. Held cues are
 * stored for the observatory and never released retroactively; in MANUAL a
 * cue waits for a producer and lapses when its wall-clock window runs out.
 */
export const applyEditorialPolicy = (
  key: FixtureKey,
  view: EditorialView,
  batch: PipelineBatch,
  timing: ApprovalTiming = {
    nowMs: Date.now(),
    windowMs: DEFAULT_APPROVAL_WINDOW_MS,
  },
): EditorialOutcome => {
  const run = new PolicyRun(key, view, timing);
  const drafts = batch.drafts.flatMap((draft) => {
    if (draft.type === 'overlay.publish')
      return run.publish(draft, draft.payload);
    if (draft.type === 'overlay.retract')
      return run.retract(draft, draft.payload);
    return [draft];
  });
  return {
    batch: {
      ...batch,
      drafts,
      overlays: run.overlays(batch.overlays),
      overlayEnds: run.ends(batch.overlayEnds),
    },
    audits: run.audits,
  };
};
