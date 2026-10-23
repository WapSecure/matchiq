import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import type { AccessDenial, AccessDeniedListener } from '@matchiq/auth';
import type { UnitOfWork } from '@matchiq/db';
import { API_AUDIT_ACTIONS, AUDIT_TARGET_KINDS } from '../constants';
import { actorTypeOf } from './actor';
import { UNIT_OF_WORK } from '../infrastructure/tokens';

export interface AuditRecord {
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly requestId?: string;
  readonly details?: Record<string, unknown>;
}

/** Who acted, as stored with every audit row the API writes. */
export const actorDetails = (principal: Principal) => ({
  actorKind: principal.kind,
  actorRoles: [...principal.roles],
});

/**
 * Writes audit rows with the real actor in the actor's own organisation
 * (ADR-0018). Also receives every 403 for an authenticated caller; those are
 * recorded best-effort so a database hiccup never turns a 403 into a 500.
 */
@Injectable()
export class AuditTrail implements AccessDeniedListener {
  private readonly logger = new Logger(AuditTrail.name);

  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork) {}

  async record(principal: Principal, record: AuditRecord): Promise<void> {
    await this.uow.transaction((tx) =>
      tx.appendAudit({
        orgId: principal.orgId,
        actor: principal.userId,
        actorType: actorTypeOf(principal),
        action: record.action,
        targetType: record.targetType,
        targetId: record.targetId,
        ...(record.requestId === undefined
          ? {}
          : { requestId: record.requestId }),
        details: { ...actorDetails(principal), ...record.details },
      }),
    );
  }

  onDenied(denial: AccessDenial): void {
    if (denial.principal.kind === 'anonymous') return;
    this.record(denial.principal, {
      action: API_AUDIT_ACTIONS.accessDenied,
      targetType: AUDIT_TARGET_KINDS.route,
      targetId: `${denial.method} ${denial.path}`,
      ...(denial.requestId === undefined
        ? {}
        : { requestId: denial.requestId }),
      details: { permission: denial.permission },
    }).catch((error: unknown) =>
      this.logger.warn(error instanceof Error ? error.message : String(error)),
    );
  }
}
