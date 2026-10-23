import {
  AUDIT_ACTIONS,
  SCHEMA_VERSION,
  type EditorialStatus,
  type OverlayRetractCause,
} from '@matchiq/contracts';
import {
  toEditorialStatus,
  type AuditEntry,
  type EditorialTransaction,
  type FixtureKey,
  type OverlayRow,
  type StreamMessageDraft,
} from '@matchiq/db';
import { Inject, Injectable } from '@nestjs/common';
import { type Actor, auditNameOf } from '../auth/actor';
import { AUDIT_TARGETS, RETRACT_REASONS } from '../constants';
import {
  CLOCK,
  type Clock,
  OUTBOX_NOTIFIER,
  type OutboxNotifier,
} from '../infrastructure/tokens';

/** Wall clock for `emittedAt` and the post-commit outbox nudge. */
@Injectable()
export class EditorialEffects {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(OUTBOX_NOTIFIER) private readonly outbox: OutboxNotifier,
  ) {}

  now(): string {
    return this.clock.now().toISOString();
  }

  /** Called after commit only when the command wrote stream messages. */
  published(result: { replayed: boolean; wrote: boolean }): void {
    if (result.wrote && !result.replayed) this.outbox.notify();
  }
}

/** Everything an operator command carries besides its target. */
export interface CommandContext {
  readonly actor: Actor;
  readonly reason: string;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly idempotencyKey?: string;
}

type EditorialCause = Exclude<
  OverlayRetractCause,
  'EXPIRED' | 'SUPERSEDED' | 'PERIOD_ENDED' | 'MATCH_ENDED' | 'CORRECTION'
>;

export const auditOf = (
  ctx: CommandContext,
  entry: Omit<
    AuditEntry,
    | 'orgId'
    | 'actor'
    | 'actorType'
    | 'actorDisplayName'
    | 'reason'
    | 'requestId'
    | 'correlationId'
  >,
): AuditEntry => ({
  orgId: ctx.actor.orgId,
  actor: ctx.actor.id,
  actorType: ctx.actor.type,
  ...auditNameOf(ctx.actor),
  reason: ctx.reason,
  ...(ctx.requestId === undefined ? {} : { requestId: ctx.requestId }),
  ...(ctx.correlationId === undefined
    ? {}
    : { correlationId: ctx.correlationId }),
  ...entry,
});

const draft = (
  fixtureId: string,
  emittedAt: string,
  body: Pick<StreamMessageDraft, 'type' | 'payload'>,
): StreamMessageDraft =>
  ({
    schemaVersion: SCHEMA_VERSION,
    fixtureId,
    emittedAt,
    ...body,
  }) as StreamMessageDraft;

export interface RetractInput {
  readonly key: FixtureKey;
  readonly overlay: OverlayRow;
  readonly cause: EditorialCause;
  readonly now: string;
}

/**
 * Takes a cue off air: row state, `overlay.retract` and the audit row in the
 * caller's transaction, which already holds the fixture lock. Returns the audit id.
 */
export const retractInTx = async (
  tx: EditorialTransaction,
  input: RetractInput,
  ctx: CommandContext,
): Promise<string> => {
  const { key, overlay, cause } = input;
  const streamReason = RETRACT_REASONS[cause];
  await tx.markOverlay(key, overlay.overlayId, {
    status: 'RETRACTED',
    state: 'RETRACTED',
    reason: ctx.reason,
    endReason: streamReason,
  });
  await tx.appendStreamMessages(key, [
    draft(key.fixtureId, input.now, {
      type: 'overlay.retract',
      payload: {
        overlayId: overlay.overlayId,
        revision: overlay.revision,
        reason: streamReason,
        cause,
      },
    }),
  ]);
  return tx.appendAudit(
    auditOf(ctx, {
      action: AUDIT_ACTIONS.overlayRetracted,
      targetType: AUDIT_TARGETS.overlay,
      targetId: overlay.overlayId,
      fixtureId: key.fixtureId,
      before: { status: overlay.status, revision: overlay.revision },
      after: { status: 'RETRACTED', revision: overlay.revision },
      details: { cause, insightId: overlay.insightId },
    }),
  );
};

/** Announces the fixture's effective editorial mode on its stream. */
export const announceStatus = async (
  tx: EditorialTransaction,
  key: FixtureKey,
  now: string,
): Promise<EditorialStatus> => {
  const status = toEditorialStatus(key.fixtureId, await tx.controls(key));
  await tx.appendStreamMessages(key, [
    draft(key.fixtureId, now, { type: 'editorial.status', payload: status }),
  ]);
  return status;
};
