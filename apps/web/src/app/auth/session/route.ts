import { effectivePermissions, Role } from '@matchiq/access';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { oidcSettings } from '@/lib/auth/server/env';
import { liveSession, settle } from '@/lib/auth/server/live-session';
import type { SessionView } from '@/lib/auth/session-view';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store' };

const knownRoles = (roles: readonly string[]): Role[] =>
  roles.filter((r): r is Role => Role.safeParse(r).success);

/**
 * What the UI needs to render role-aware controls. Display only: the API
 * enforces every permission again on each request.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const env = oidcSettings();
  if (env === null) {
    const body: SessionView = { status: 'anonymous', ssoEnabled: false };
    return NextResponse.json(body, { headers: NO_STORE });
  }
  const live = await liveSession(request, env);
  let body: SessionView;
  if (live.kind === 'active') {
    const roles = knownRoles(live.session.user.roles);
    body = {
      status: 'authenticated',
      ssoEnabled: true,
      user: { ...live.session.user, roles },
      permissions: effectivePermissions(roles),
    };
  } else {
    body = {
      status: live.kind === 'expired' ? 'expired' : 'anonymous',
      ssoEnabled: true,
    };
  }
  return settle(NextResponse.json(body, { headers: NO_STORE }), env, live);
}
