import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import {
  AUTH_FAILURES,
  CurrentPrincipal,
  RequireAuthenticated,
  unauthorizedProblem,
} from '@matchiq/auth';
import type { AccessProfile } from '@matchiq/contracts';
import { AuditTrail } from '../auth/audit-trail.service';
import { API_AUDIT_ACTIONS, AUDIT_TARGET_KINDS, ROUTES } from '../constants';
import { Caller, type CallerContext } from '../http/caller-context';

const profileOf = (principal: Principal): AccessProfile => ({
  kind: principal.kind,
  userId: principal.userId,
  orgId: principal.orgId,
  orgName: principal.orgName ?? null,
  displayName: principal.displayName ?? null,
  roles: [...principal.roles],
  permissions: [...principal.permissions],
});

/** The caller itself. Sign-in and sign-out are recorded by the web BFF (ADR-0018). */
@Controller(ROUTES.me)
export class MeController {
  constructor(private readonly audit: AuditTrail) {}

  @Get()
  @RequireAuthenticated()
  me(@CurrentPrincipal() principal: Principal): AccessProfile {
    return profileOf(principal);
  }

  @Post(ROUTES.meSignIn)
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAuthenticated()
  signedIn(@Caller() caller: CallerContext): Promise<void> {
    return this.record(caller, API_AUDIT_ACTIONS.signedIn);
  }

  @Post(ROUTES.meSignOut)
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAuthenticated()
  signedOut(@Caller() caller: CallerContext): Promise<void> {
    return this.record(caller, API_AUDIT_ACTIONS.signedOut);
  }

  private record(caller: CallerContext, action: string): Promise<void> {
    const { principal } = caller;
    if (principal.kind === 'anonymous')
      throw unauthorizedProblem(AUTH_FAILURES.missing);
    return this.audit.record(principal, {
      action,
      targetType: AUDIT_TARGET_KINDS.user,
      targetId: principal.userId,
      ...(caller.requestId === undefined
        ? {}
        : { requestId: caller.requestId }),
    });
  }
}
