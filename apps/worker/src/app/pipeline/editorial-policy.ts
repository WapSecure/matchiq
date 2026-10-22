import {
  AUDIT_ACTIONS,
  type OverlayCue,
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
} from '@matchiq/db';
import { EDITORIAL_REASONS, OVERLAY_END_REASONS } from '../constants';
import type { PipelineBatch } from './pipeline-batch';

export interface EditorialOutcome {
  readonly batch: PipelineBatch;
  readonly audits: AuditEntry[];
}

type Publish = StreamMessageOf<'overlay.publish'>['payload'];
type Retract = StreamMessageOf<'overlay.retract'>['payload'];

/** Overlay and insight ids whose editorial state the batch depends on. */
export const editorialIds = (batch: PipelineBatch) => ({
  overlayIds: [
    ...new Set([
      ...batch.overlays.map((r) => r.cue.overlayId),
      ...batch.overlayEnds.map((e) => e.overlayId),
    ]),
  ],
  insightIds: [
    ...new Set(batch.overlays.flatMap((r) => r.cue.insightId ?? [])),
  ],
});

const recordKey = (cue: Pick<OverlayCue, 'overlayId' | 'revision'>) =>
  `${cue.overlayId}#${cue.revision}`;

class PolicyRun {
  readonly audits: AuditEntry[] = [];
  private readonly blocked: Map<string, OverlayEditorialState>;
  private readonly dropped = new Set<string>();
  private readonly held = new Map<string, OverlayRecord['editorial']>();
  private readonly endsDropped = new Set<string>();

  constructor(
    private readonly key: FixtureKey,
    private readonly view: EditorialView,
  ) {
    this.blocked = new Map(view.overlays);
  }

  /** False when the draft must not reach the stream. */
  publish(cue: Publish): boolean {
    const state = this.blocked.get(cue.overlayId);
    if (state !== undefined) {
      this.block(cue, AUDIT_ACTIONS.overlayBlocked, EDITORIAL_REASONS.offAir);
      return false;
    }
    if (cue.insightId && this.view.suppressedInsights.has(cue.insightId)) {
      this.hold(cue, 'SUPPRESSED', EDITORIAL_REASONS.suppressed);
      return false;
    }
    if (this.view.mode === 'AUTO') return true;
    const reason = EDITORIAL_REASONS[this.view.mode];
    // A cue already on air keeps its stored row: only its new revision is withheld.
    if (this.view.aired.has(cue.overlayId)) {
      this.block(cue, AUDIT_ACTIONS.overlayBlocked, reason);
    } else {
      this.hold(cue, 'HELD', reason);
    }
    return false;
  }

  retract(payload: Retract): boolean {
    if (this.blocked.has(payload.overlayId)) {
      this.endsDropped.add(payload.overlayId);
      return false;
    }
    if (payload.reason === OVERLAY_END_REASONS.superseded) {
      this.audit(payload.overlayId, AUDIT_ACTIONS.overlayRetracted, {
        actor: AUDIT_ACTORS.overlayScheduler,
        reason: payload.reason,
        details: { revision: payload.revision, cause: 'SUPERSEDED' },
      });
    }
    return true;
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

  keepsEnd(overlayId: string): boolean {
    return !this.endsDropped.has(overlayId);
  }

  private hold(cue: Publish, state: OverlayEditorialState, reason: string) {
    this.blocked.set(cue.overlayId, state);
    this.held.set(recordKey(cue), { state, reason });
    this.audit(cue.overlayId, AUDIT_ACTIONS.overlayHeld, {
      actor: AUDIT_ACTORS.publishGate,
      reason,
      details: { revision: cue.revision, insightId: cue.insightId ?? null },
    });
  }

  private block(cue: Publish, action: string, reason: string) {
    this.dropped.add(recordKey(cue));
    this.audit(cue.overlayId, action, {
      actor: AUDIT_ACTORS.publishGate,
      reason,
      details: { revision: cue.revision, insightId: cue.insightId ?? null },
    });
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
 * stored for the observatory and never released retroactively.
 */
export const applyEditorialPolicy = (
  key: FixtureKey,
  view: EditorialView,
  batch: PipelineBatch,
): EditorialOutcome => {
  const run = new PolicyRun(key, view);
  const drafts = batch.drafts.filter((draft) => {
    if (draft.type === 'overlay.publish') return run.publish(draft.payload);
    if (draft.type === 'overlay.retract') return run.retract(draft.payload);
    return true;
  });
  return {
    batch: {
      ...batch,
      drafts,
      overlays: run.overlays(batch.overlays),
      overlayEnds: batch.overlayEnds.filter((e) => run.keepsEnd(e.overlayId)),
    },
    audits: run.audits,
  };
};

/** Gate rejections of agent output are blocks too, so each gets an audit row. */
export const gateAudits = (
  key: FixtureKey,
  batch: PipelineBatch,
): AuditEntry[] =>
  batch.completions.flatMap(({ insightId, completion }) => {
    const { rejected } = completion.gateReport;
    if (rejected.length === 0) return [];
    const run = batch.agentRuns.find((r) => r.insightId === insightId);
    return [
      {
        orgId: key.orgId,
        actor: AUDIT_ACTORS.publishGate,
        actorType: 'SYSTEM' as const,
        action: AUDIT_ACTIONS.publicationGated,
        targetType: AUDIT_TARGET_TYPES.insight,
        targetId: insightId,
        fixtureId: key.fixtureId,
        ...(run?.runs[0] ? { correlationId: run.runs[0].correlationId } : {}),
        details: {
          rejected: rejected.map((r) => ({
            item: r.item,
            source: r.source,
            codes: [...r.codes],
          })),
        },
      },
    ];
  });
