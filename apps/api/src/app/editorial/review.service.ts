import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  ReviewInsightResult,
  type OverlayReviewList,
  type ReviewInsightCommand,
} from '@matchiq/contracts';
import {
  editorialModeOf,
  type EditorialReader,
  type EditorialTransaction,
  type EditorialUnitOfWork,
  type FixtureKey,
  type ReviewCueRow,
  type StoredResponse,
} from '@matchiq/db';
import {
  AUDIT_TARGETS,
  EDITORIAL_DETAILS,
  IDEMPOTENCY_SCOPES,
  REVIEW_DETAILS,
} from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import { EDITORIAL_READER, EDITORIAL_UOW } from '../infrastructure/tokens';
import { auditOf, draft, EditorialEffects } from './editorial-writes';
import {
  approvedCue,
  rejectInTx,
  reviewDraft,
  slotOpen,
  type ReviewContext,
} from './review-writes';

type Reply = StoredResponse & { body: ReviewInsightResult };

interface ReviewTarget {
  readonly key: FixtureKey;
  readonly row: ReviewCueRow;
  readonly insightId: string;
}

const TARGET_STATE = { APPROVE: 'APPROVED', REJECT: 'REJECTED' } as const;

/**
 * Approve-before-air (spec §29, §45; ADR-0022). Each review takes the fixture
 * row lock the worker's batch write takes, so a cue whose slot closes is
 * either expired by the worker first or aired by the approval first, never both.
 */
@Injectable()
export class ReviewService {
  constructor(
    @Inject(EDITORIAL_UOW) private readonly uow: EditorialUnitOfWork,
    @Inject(EDITORIAL_READER) private readonly reader: EditorialReader,
    private readonly effects: EditorialEffects,
  ) {}

  async queue(orgId: string, fixtureId: string): Promise<OverlayReviewList> {
    const items = await this.reader.reviews({ orgId, fixtureId });
    if (items === null) throw problem('fixtureNotFound', { detail: fixtureId });
    return { items };
  }

  async review(
    insightId: string,
    command: ReviewInsightCommand,
    ctx: ReviewContext,
  ): Promise<IdempotentResult<ReviewInsightResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: IDEMPOTENCY_SCOPES.reviewInsight,
          key: ctx.idempotencyKey,
          request: { insightId, command },
          parse: (body) => ReviewInsightResult.parse(body),
        },
        () => this.reviewWork(tx, insightId, command, ctx),
      ),
    );
    this.effects.published({ ...result, wrote: result.body.changed });
    return result;
  }

  private async target(
    tx: EditorialTransaction,
    insightId: string,
    orgId: string,
  ): Promise<ReviewTarget> {
    const fixtureId = await tx.fixtureOfInsight(orgId, insightId);
    const key = fixtureId === null ? null : { orgId, fixtureId };
    if (key === null || !(await tx.lockFixture(key))) {
      throw problem('insightNotFound', { detail: insightId });
    }
    const row = await tx.reviewCueOfInsight(key, insightId);
    if (row === null) {
      throw problem('overlayNotFound', {
        detail: REVIEW_DETAILS.noCue(insightId),
      });
    }
    return { key, row, insightId };
  }

  private async reviewWork(
    tx: EditorialTransaction,
    insightId: string,
    command: ReviewInsightCommand,
    ctx: ReviewContext,
  ): Promise<Reply> {
    const target = await this.target(tx, insightId, ctx.actor.orgId);
    const { row } = target;
    const state = TARGET_STATE[command.decision];
    if (row.editorialState === state) {
      return this.reply(target, { state, changed: false, auditId: null });
    }
    if (row.editorialState === 'APPROVAL_EXPIRED') {
      throw problem('approvalExpired', { detail: row.overlayId });
    }
    if (row.editorialState !== 'AWAITING_APPROVAL') {
      throw problem('overlayNotAwaiting', {
        detail: EDITORIAL_DETAILS.overlayState(
          row.editorialState ?? row.status,
        ),
      });
    }
    if (command.revision !== undefined && command.revision !== row.revision) {
      throw problem('reviewStale', {
        detail: REVIEW_DETAILS.revision(command.revision, row.revision),
      });
    }
    if (command.decision === 'REJECT') {
      const auditId = await rejectInTx(
        tx,
        {
          key: target.key,
          overlay: row,
          now: this.effects.now(),
          cause: 'PRODUCER',
        },
        ctx,
      );
      return this.reply(target, { state, changed: true, auditId });
    }
    return this.approve(tx, target, command, ctx);
  }

  private async approve(
    tx: EditorialTransaction,
    target: ReviewTarget,
    command: ReviewInsightCommand,
    ctx: ReviewContext,
  ): Promise<Reply> {
    const { key, row } = target;
    const mode = editorialModeOf(await tx.controls(key));
    if (mode !== 'AUTO') throw problem('airPaused', { detail: mode });
    const clock = await tx.sessionClock(key);
    if (!slotOpen(row, clock)) {
      throw problem('approvalExpired', { detail: row.overlayId });
    }
    const cue = approvedCue(row, clock, command);
    const now = this.effects.now();
    await tx.airApproved(key, { cue, reason: ctx.reason ?? null });
    await tx.appendStreamMessages(key, [
      draft(key.fixtureId, now, { type: 'overlay.publish', payload: cue }),
      reviewDraft(key, now, row, 'APPROVED'),
    ]);
    const auditId = await tx.appendAudit(
      auditOf(ctx, {
        action: AUDIT_ACTIONS.overlayApproved,
        targetType: AUDIT_TARGETS.overlay,
        targetId: row.overlayId,
        fixtureId: key.fixtureId,
        before: {
          state: 'AWAITING_APPROVAL',
          revision: row.revision,
          priority: row.cue.priority,
          clockEndMs: row.cue.clockEndMs,
        },
        after: {
          state: 'APPROVED',
          revision: cue.revision,
          priority: cue.priority,
          clockStartMs: cue.clockStartMs,
          clockEndMs: cue.clockEndMs,
        },
        details: { insightId: target.insightId },
      }),
    );
    return this.reply(target, {
      state: 'APPROVED',
      changed: true,
      auditId,
      cue,
    });
  }

  private reply(
    target: ReviewTarget,
    outcome: Pick<ReviewInsightResult, 'state' | 'changed' | 'auditId'> & {
      cue?: ReviewInsightResult['cue'];
    },
  ): Reply {
    return {
      status: HttpStatus.OK,
      body: {
        insightId: target.insightId,
        overlayId: target.row.overlayId,
        fixtureId: target.key.fixtureId,
        revision: target.row.revision,
        state: outcome.state,
        changed: outcome.changed,
        auditId: outcome.auditId,
        cue: outcome.cue ?? null,
      },
    };
  }
}
