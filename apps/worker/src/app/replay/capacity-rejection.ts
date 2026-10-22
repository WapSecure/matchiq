import {
  SCHEMA_VERSION,
  type ReplayCommand,
  type ReplayStatus,
} from '@matchiq/contracts';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type FixtureKey,
  type PipelineUnitOfWork,
} from '@matchiq/db';
import { REPLAY_CAPACITY_REASON } from './replay.constants';

export interface CapacityRejection {
  readonly key: FixtureKey;
  /** The session's unchanged status, re-announced so waiting clients settle. */
  readonly status: ReplayStatus;
  readonly command: ReplayCommand;
  readonly active: number;
  readonly max: number;
  readonly emittedAt: string;
}

/**
 * The worker's capacity backstop: a start or resume that would exceed the
 * limit is not applied. Instead the session's real status is written to its
 * stream and the refusal is audited in the same transaction, so the client
 * sees the command did not take and operators can see why.
 */
export const recordCapacityRejection = (
  uow: PipelineUnitOfWork,
  rejection: CapacityRejection,
): Promise<void> =>
  uow.transaction(async (tx) => {
    const { key, status, command, active, max } = rejection;
    if (!(await tx.lockFixture(key))) return;
    await tx.appendStreamMessages(key, [
      {
        schemaVersion: SCHEMA_VERSION,
        fixtureId: key.fixtureId,
        emittedAt: rejection.emittedAt,
        type: 'replay.status',
        payload: status,
      },
    ]);
    await tx.appendAudit({
      orgId: key.orgId,
      actor: AUDIT_ACTORS.worker,
      actorType: 'SYSTEM',
      fixtureId: key.fixtureId,
      action: AUDIT_ACTIONS.commandRejected,
      targetType: AUDIT_TARGET_TYPES.fixture,
      targetId: key.fixtureId,
      details: { reason: REPLAY_CAPACITY_REASON, command, active, max },
    });
  });
