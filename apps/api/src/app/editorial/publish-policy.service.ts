import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  EditorialStatusResult,
  type PublishPolicy,
} from '@matchiq/contracts';
import {
  toEditorialStatus,
  type EditorialTransaction,
  type EditorialUnitOfWork,
  type StoredResponse,
} from '@matchiq/db';
import { AUDIT_TARGETS, IDEMPOTENCY_SCOPES } from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import { EDITORIAL_UOW } from '../infrastructure/tokens';
import {
  announceStatus,
  auditOf,
  type CommandContext,
  EditorialEffects,
} from './editorial-writes';

type Reply = StoredResponse & { body: EditorialStatusResult };

const policyOf = (active: boolean | undefined): PublishPolicy =>
  active ? 'MANUAL' : 'AUTO';

/**
 * Per-session publish policy (ADR-0023), stored as the session's `APPROVAL`
 * control row. Switching never releases or drops a cue already waiting: it
 * keeps waiting until a producer reviews it or its slot closes.
 */
@Injectable()
export class PublishPolicyService {
  constructor(
    @Inject(EDITORIAL_UOW) private readonly uow: EditorialUnitOfWork,
    private readonly effects: EditorialEffects,
  ) {}

  async set(
    fixtureId: string,
    policy: PublishPolicy,
    ctx: CommandContext,
  ): Promise<IdempotentResult<EditorialStatusResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: IDEMPOTENCY_SCOPES.publishPolicy,
          key: ctx.idempotencyKey,
          request: { fixtureId, policy, reason: ctx.reason },
          parse: (body) => EditorialStatusResult.parse(body),
        },
        () => this.work(tx, fixtureId, policy, ctx),
      ),
    );
    this.effects.published({ ...result, wrote: result.body.changed });
    return result;
  }

  private async work(
    tx: EditorialTransaction,
    fixtureId: string,
    policy: PublishPolicy,
    ctx: CommandContext,
  ): Promise<Reply> {
    const key = { orgId: ctx.actor.orgId, fixtureId };
    if (!(await tx.lockFixture(key))) {
      throw problem('fixtureNotFound', { detail: fixtureId });
    }
    const current = await tx.controlForUpdate(key.orgId, 'APPROVAL', fixtureId);
    const before = policyOf(current?.active);
    if (before === policy) {
      const status = toEditorialStatus(fixtureId, await tx.controls(key));
      return {
        status: HttpStatus.OK,
        body: { status, changed: false, auditId: null },
      };
    }
    await tx.saveControl({
      orgId: key.orgId,
      scope: 'APPROVAL',
      scopeId: fixtureId,
      active: policy === 'MANUAL',
      reason: ctx.reason,
      changedBy: ctx.actor.id,
    });
    const status = await announceStatus(tx, key, this.effects.now());
    const auditId = await tx.appendAudit(
      auditOf(ctx, {
        action: AUDIT_ACTIONS.publishPolicyChanged,
        targetType: AUDIT_TARGETS.fixture,
        targetId: fixtureId,
        fixtureId,
        before: { publishPolicy: before },
        after: { publishPolicy: policy },
        details: {},
      }),
    );
    return { status: HttpStatus.OK, body: { status, changed: true, auditId } };
  }
}
