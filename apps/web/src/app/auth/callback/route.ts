import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_ERRORS, AUTH_ROUTES } from '@/constants/auth';
import { notifyApi } from '@/lib/auth/server/api-notify';
import { oidcSettings } from '@/lib/auth/server/env';
import { completeSignIn, redirectUri } from '@/lib/auth/server/oidc';
import { redirectTo, signInError } from '@/lib/auth/server/redirects';
import {
  clearTransaction,
  readTransaction,
  writeSession,
} from '@/lib/auth/server/session';

export const dynamic = 'force-dynamic';

/**
 * The redirect URI. The current URL is rebuilt from the public origin so
 * the token request matches the registered redirect URI behind a proxy.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const env = oidcSettings();
  if (env === null)
    return NextResponse.redirect(new URL(AUTH_ROUTES.signInPage, request.url));
  const failure = signInError(env, AUTH_ERRORS.callback);
  clearTransaction(failure, env);
  const transaction = await readTransaction(request, env);
  if (transaction === null) return failure;
  const current = new URL(redirectUri(env));
  current.search = request.nextUrl.search;
  let session;
  try {
    session = await completeSignIn(env, current, transaction);
  } catch {
    return failure;
  }
  if (session === null) return failure;
  const response = redirectTo(env, transaction.returnTo);
  clearTransaction(response, env);
  await writeSession(response, env, session);
  await notifyApi(env, session.accessToken, 'sign-in');
  return response;
}
