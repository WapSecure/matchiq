import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_ROUTES } from '@/constants/auth';
import { notifyApi } from '@/lib/auth/server/api-notify';
import { callbackUrl, oidcSettings } from '@/lib/auth/server/env';
import { endSessionUrl } from '@/lib/auth/server/oidc';
import { isSameOrigin, redirectTo } from '@/lib/auth/server/redirects';
import { clearSession, readSession } from '@/lib/auth/server/session';

export const dynamic = 'force-dynamic';

const FORBIDDEN = 403;

/** POST only, from this origin: clears the session, then ends the provider session. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const env = oidcSettings();
  if (env === null)
    return NextResponse.redirect(new URL(AUTH_ROUTES.signInPage, request.url));
  if (!isSameOrigin(request, env))
    return new NextResponse(null, { status: FORBIDDEN });
  const session = await readSession(request, env);
  if (session) await notifyApi(env, session.accessToken, 'sign-out');
  const home = callbackUrl(env, '/');
  let target: URL | null = null;
  try {
    target = await endSessionUrl(env, session?.idToken, home);
  } catch {
    target = null;
  }
  const response = target
    ? NextResponse.redirect(target, { status: 303 })
    : redirectTo(env, '/');
  clearSession(response, env);
  return response;
}
