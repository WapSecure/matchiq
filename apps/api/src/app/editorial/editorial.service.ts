import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  RetractOverlayResult,
  SuppressInsightResult,
} from '@matchiq/contracts';
import type {
  EditorialTransaction,
  EditorialUnitOfWork,
  FixtureKey,
  OverlayRow,
  StoredResponse,
} from '@matchiq/db';
import {
  AUDIT_TARGETS,
  EDITORIAL_DETAILS,
  IDEMPOTENCY_SCOPES,
} from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import { EDITORIAL_UOW } from '../infrastructure/tokens';
import {
  auditOf,
  type CommandContext,
  EditorialEffects,
  retractInTx,
} from './editorial-writes';
import { isOnAir, rejectInTx } from './review-writes';

const OK = HttpStatus.OK;

type Reply<T> = StoredResponse & { body: T };

/**
 * Producer actions on single items (spec §5, §44, §45). Each command takes the
 * fixture row lock, the same lock the worker's publish path takes, so a
 * retraction and a concurrent publication are strictly ordered.
 */
@Injectable()
export class EditorialService {
  constructor(
    @Inject(EDITORIAL_UOW) private readonly uow: EditorialUnitOfWork,
    private readonly effects: EditorialEffects,
  ) {}

  async retractOverlay(
    overlayId: string,
    ctx: CommandContext,
  ): Promise<IdempotentResult<RetractOverlayResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: IDEMPOTENCY_SCOPES.retractOverlay,
          key: ctx.idempotencyKey,
          request: { overlayId, reason: ctx.reason },
          parse: (body) => RetractOverlayResult.parse(body),
        },
        () => this.retractWork(tx, overlayId, ctx),
      ),
    );
    this.effects.published({ ...result, wrote: result.body.changed });
    return result;
  }

  async suppressInsight(
    insightId: string,
    ctx: CommandContext,
  ): Promise<IdempotentResult<SuppressInsightResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: IDEMPOTENCY_SCOPES.suppressInsight,
          key: ctx.idempotencyKey,
          request: { insightId, reason: ctx.reason },
          parse: (body) => SuppressInsightResult.parse(body),
        },
        () => this.suppressWork(tx, insightId, ctx),
      ),
    );
    this.effects.published({
      ...result,
      wrote: result.body.retractedOverlayId !== null,
    });
    return result;
  }

  private async lockedKey(
    tx: EditorialTransaction,
    fixtureId: string | null,
    ctx: CommandContext,
  ): Promise<FixtureKey | null> {
    if (fixtureId === null) return null;
    const key = { orgId: ctx.actor.orgId, fixtureId };
    return (await tx.lockFixture(key)) ? key : null;
  }

  private async retractWork(
    tx: EditorialTransaction,
    overlayId: string,
    ctx: CommandContext,
  ): Promise<Reply<RetractOverlayResult>> {
    const fixtureId = await tx.fixtureOfOverlay(ctx.actor.orgId, overlayId);
    const key = await this.lockedKey(tx, fixtureId, ctx);
    const overlay = key && (await tx.overlayForUpdate(key, overlayId));
    if (!key || !overlay)
      throw problem('overlayNotFound', { detail: overlayId });
    const base = {
      overlayId,
      fixtureId: key.fixtureId,
      revision: overlay.revision,
      status: 'RETRACTED' as const,
    };
    if (overlay.editorialState === 'RETRACTED') {
      return { status: OK, body: { ...base, changed: false, auditId: null } };
    }
    if (!isOnAir(overlay)) {
      throw problem('overlayNotOnAir', {
        detail: EDITORIAL_DETAILS.overlayState(
          overlay.editorialState ?? overlay.status,
        ),
      });
    }
    const auditId = await retractInTx(
      tx,
      { key, overlay, cause: 'PRODUCER', now: this.effects.now() },
      ctx,
    );
    return { status: OK, body: { ...base, changed: true, auditId } };
  }

  private async suppressWork(
    tx: EditorialTransaction,
    insightId: string,
    ctx: CommandContext,
  ): Promise<Reply<SuppressInsightResult>> {
    const fixtureId = await tx.fixtureOfInsight(ctx.actor.orgId, insightId);
    const key = await this.lockedKey(tx, fixtureId, ctx);
    const insight = key && (await tx.insightForUpdate(key, insightId));
    if (!key || !insight)
      throw problem('insightNotFound', { detail: insightId });
    const base = {
      insightId,
      fixtureId: key.fixtureId,
      status: 'REJECTED' as const,
    };
    if (insight.editorialState === 'SUPPRESSED') {
      return {
        status: OK,
        body: {
          ...base,
          changed: false,
          auditId: null,
          retractedOverlayId: null,
        },
      };
    }
    if (insight.publication !== 'PENDING') {
      throw problem('insightPublished', {
        detail: EDITORIAL_DETAILS.insightState(insight.publication),
      });
    }
    await tx.suppressInsight(key, insightId, ctx.reason);
    const overlay = await this.retractInsightCue(tx, key, insightId, ctx);
    const onAir = overlay !== null;
    const auditId = await tx.appendAudit(
      auditOf(ctx, {
        action: AUDIT_ACTIONS.insightSuppressed,
        targetType: AUDIT_TARGETS.insight,
        targetId: insightId,
        fixtureId: key.fixtureId,
        before: { status: insight.status, publication: insight.publication },
        after: { status: 'REJECTED', editorialState: 'SUPPRESSED' },
        details: { overlayId: overlay?.overlayId ?? null, retracted: onAir },
      }),
    );
    const retractedOverlayId = overlay?.overlayId ?? null;
    return {
      status: OK,
      body: { ...base, changed: true, auditId, retractedOverlayId },
    };
  }

  /** The insight's cue, if it was on air and has now been retracted with it; a waiting cue is rejected. */
  private async retractInsightCue(
    tx: EditorialTransaction,
    key: FixtureKey,
    insightId: string,
    ctx: CommandContext,
  ): Promise<OverlayRow | null> {
    const overlay = await tx.overlayOfInsight(key, insightId);
    if (overlay?.editorialState === 'AWAITING_APPROVAL') {
      const now = this.effects.now();
      await rejectInTx(
        tx,
        { key, overlay, now, cause: 'INSIGHT_SUPPRESSED' },
        ctx,
      );
      return null;
    }
    if (overlay === null || !isOnAir(overlay)) return null;
    const now = this.effects.now();
    await retractInTx(
      tx,
      { key, overlay, cause: 'INSIGHT_SUPPRESSED', now },
      ctx,
    );
    return overlay;
  }
}
