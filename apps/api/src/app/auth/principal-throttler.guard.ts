import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Principal } from '@matchiq/access';
import { PRINCIPAL_PROPERTY } from '@matchiq/auth';

/**
 * Signed-in callers get their own budget, keyed by organisation and user,
 * so users behind one proxy (or the web BFF) do not share a bucket. The
 * anonymous demo keeps the per-client-IP budget. Runs after authentication.
 */
@Injectable()
export class PrincipalThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    const principal = req[PRINCIPAL_PROPERTY] as Principal | undefined;
    if (principal !== undefined && principal.kind !== 'anonymous')
      return Promise.resolve(`${principal.orgId}:${principal.userId}`);
    return super.getTracker(req);
  }
}
