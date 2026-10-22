import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  AUTH_ERRORS,
  AUTH_QUERY,
  AUTH_ROUTES,
  LOGIN_HINT_PATTERN,
} from '@/constants/auth';
import { oidcSettings } from '@/lib/auth/server/env';
import { beginSignIn } from '@/lib/auth/server/oidc';
import { safeReturnTo, signInError } from '@/lib/auth/server/redirects';
import { writeTransaction } from '@/lib/auth/server/session';

export const dynamic = 'force-dynamic';

/** Starts Authorization Code + PKCE; the verifier, state and nonce stay in a sealed cookie. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const env = oidcSettings();
  if (env === null)
    return NextResponse.redirect(new URL(AUTH_ROUTES.signInPage, request.url));
  const params = request.nextUrl.searchParams;
  const hint = params.get(AUTH_QUERY.loginHint);
  try {
    const { url, transaction } = await beginSignIn(env, {
      returnTo: safeReturnTo(params.get(AUTH_QUERY.returnTo)),
      ...(hint && LOGIN_HINT_PATTERN.test(hint) ? { loginHint: hint } : {}),
    });
    const response = NextResponse.redirect(url, { status: 303 });
    await writeTransaction(response, env, transaction);
    return response;
  } catch {
    return signInError(env, AUTH_ERRORS.unavailable);
  }
}
