import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  EditorialStatusResult,
  KillSwitchResult,
  type EditorialControl,
  type EditorialStatus,
  type KillSwitchStatus,
} from '@matchiq/contracts';
import {
  DB_LIMITS,
  toEditorialStatus,
  type EditorialControlRow,
  type EditorialReader,
  type EditorialTransaction,
  type EditorialUnitOfWork,
  type StoredResponse,
} from '@matchiq/db';
import { AUDIT_TARGETS, IDEMPOTENCY_SCOPES } from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import { EDITORIAL_READER, EDITORIAL_UOW } from '../infrastructure/tokens';
import {
  announceStatus,
  auditOf,
  type CommandContext,
  EditorialEffects,
  retractInTx,
} from './editorial-writes';
import { isOnAir } from './review-writes';

type Reply<T> = StoredResponse & { body: T };

const controlView = (row: EditorialControlRow | null): EditorialControl => ({
  active: row?.active ?? false,
  changedAt: row?.changedAt.toISOString() ?? null,
});

/**
 * Session freeze and the organisation kill switch (spec §44, §48, §50
 * runbook 3). Changing a control never releases held cues; a resumed session
 * only publishes cues scheduled after the change.
 */
@Injectable()
export class EditorialControlsService {
  constructor(
    @Inject(EDITORIAL_UOW) private readonly uow: EditorialUnitOfWork,
    @Inject(EDITORIAL_READER) private readonly reader: EditorialReader,
    private readonly effects: EditorialEffects,
  ) {}

  async status(orgId: string, fixtureId: string): Promise<EditorialStatus> {
    const status = await this.reader.status({ orgId, fixtureId });
    if (status === null)
      throw problem('fixtureNotFound', { detail: fixtureId });
    return status;
  }

  async killSwitch(orgId: string): Promise<KillSwitchStatus> {
    return { killSwitch: controlView(await this.reader.killSwitch(orgId)) };
  }

  async setFreeze(
    fixtureId: string,
    active: boolean,
    ctx: CommandContext,
  ): Promise<IdempotentResult<EditorialStatusResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: active ? IDEMPOTENCY_SCOPES.freeze : IDEMPOTENCY_SCOPES.resume,
          key: ctx.idempotencyKey,
          request: { fixtureId, reason: ctx.reason },
          parse: (body) => EditorialStatusResult.parse(body),
        },
        () => this.freezeWork(tx, fixtureId, active, ctx),
      ),
    );
    this.effects.published({ ...result, wrote: result.body.changed });
    return result;
  }

  async setKillSwitch(
    active: boolean,
    ctx: CommandContext,
  ): Promise<IdempotentResult<KillSwitchResult>> {
    const result = await this.uow.transaction((tx) =>
      withIdempotency(
        tx,
        {
          orgId: ctx.actor.orgId,
          scope: active
            ? IDEMPOTENCY_SCOPES.killSwitchActivate
            : IDEMPOTENCY_SCOPES.killSwitchRelease,
          key: ctx.idempotencyKey,
          request: { reason: ctx.reason },
          parse: (body) => KillSwitchResult.parse(body),
        },
        () => this.killSwitchWork(tx, active, ctx),
      ),
    );
    this.effects.published({ ...result, wrote: result.body.changed });
    return result;
  }

  private async freezeWork(
    tx: EditorialTransaction,
    fixtureId: string,
    active: boolean,
    ctx: CommandContext,
  ): Promise<Reply<EditorialStatusResult>> {
    const key = { orgId: ctx.actor.orgId, fixtureId };
    if (!(await tx.lockFixture(key))) {
      throw problem('fixtureNotFound', { detail: fixtureId });
    }
    const current = await tx.controlForUpdate(key.orgId, 'FIXTURE', fixtureId);
    if ((current?.active ?? false) === active) {
      const status = toEditorialStatus(fixtureId, await tx.controls(key));
      return {
        status: HttpStatus.OK,
        body: { status, changed: false, auditId: null },
      };
    }
    await tx.saveControl({
      orgId: key.orgId,
      scope: 'FIXTURE',
      scopeId: fixtureId,
      active,
      reason: ctx.reason,
      changedBy: ctx.actor.id,
    });
    const status = await announceStatus(tx, key, this.effects.now());
    const auditId = await tx.appendAudit(
      auditOf(ctx, {
        action: active
          ? AUDIT_ACTIONS.editorialFrozen
          : AUDIT_ACTIONS.editorialResumed,
        targetType: AUDIT_TARGETS.fixture,
        targetId: fixtureId,
        fixtureId,
        before: { frozen: current?.active ?? false },
        after: { frozen: active, mode: status.mode },
        details: {},
      }),
    );
    return { status: HttpStatus.OK, body: { status, changed: true, auditId } };
  }

  private async killSwitchWork(
    tx: EditorialTransaction,
    active: boolean,
    ctx: CommandContext,
  ): Promise<Reply<KillSwitchResult>> {
    const { orgId } = ctx.actor;
    const current = await tx.controlForUpdate(orgId, 'ORG', orgId);
    if ((current?.active ?? false) === active) {
      return {
        status: HttpStatus.OK,
        body: {
          killSwitch: controlView(current),
          changed: false,
          auditId: null,
          fixtureIds: [],
          retractedOverlayIds: [],
        },
      };
    }
    const saved = await tx.saveControl({
      orgId,
      scope: 'ORG',
      scopeId: orgId,
      active,
      reason: ctx.reason,
      changedBy: ctx.actor.id,
    });
    const fixtureIds = (await tx.activeSessionIds(orgId)).slice(
      0,
      DB_LIMITS.killSwitchFixturesMax,
    );
    const retractedOverlayIds = await this.applyToSessions(
      tx,
      { fixtureIds, active },
      ctx,
    );
    const auditId = await tx.appendAudit(
      auditOf(ctx, {
        action: active
          ? AUDIT_ACTIONS.killSwitchActivated
          : AUDIT_ACTIONS.killSwitchReleased,
        targetType: AUDIT_TARGETS.organization,
        targetId: orgId,
        before: { active: current?.active ?? false },
        after: { active },
        details: { fixtureIds, retractedOverlayIds },
      }),
    );
    return {
      status: HttpStatus.OK,
      body: {
        killSwitch: controlView(saved),
        changed: true,
        auditId,
        fixtureIds,
        retractedOverlayIds,
      },
    };
  }

  /** Locks sessions in id order; activation clears the air before announcing. */
  private async applyToSessions(
    tx: EditorialTransaction,
    input: { fixtureIds: readonly string[]; active: boolean },
    ctx: CommandContext,
  ): Promise<string[]> {
    const retracted: string[] = [];
    const now = this.effects.now();
    for (const fixtureId of input.fixtureIds) {
      const key = { orgId: ctx.actor.orgId, fixtureId };
      if (!(await tx.lockFixture(key))) continue;
      const live = input.active ? await tx.liveOverlays(key) : [];
      for (const overlay of live.filter(isOnAir)) {
        await retractInTx(tx, { key, overlay, cause: 'KILL_SWITCH', now }, ctx);
        retracted.push(overlay.overlayId);
      }
      await announceStatus(tx, key, now);
    }
    return retracted;
  }
}
