import { NextResponse } from 'next/server';
import { AUTH_QUERY, AUTH_ROUTES, SAFE_RETURN_PATH } from '@/constants/auth';
import { ROUTES } from '@/constants/navigation';
import { callbackUrl, type OidcSettings } from './env';

/** Only same-origin paths; `//host` and backslash tricks fall back to the lobby. */
export const safeReturnTo = (value: string | null): string =>
  value !== null && SAFE_RETURN_PATH.test(value) ? value : ROUTES.fixtures;

export const redirectTo = (env: OidcSettings, path: string): NextResponse =>
  NextResponse.redirect(callbackUrl(env, path), { status: 303 });

export const signInError = (env: OidcSettings, error: string): NextResponse =>
  redirectTo(env, `${AUTH_ROUTES.signInPage}?${AUTH_QUERY.error}=${error}`);

/** Forms that change session state must come from this origin (CSRF). */
export const isSameOrigin = (request: Request, env: OidcSettings): boolean => {
  const origin = request.headers.get('origin');
  return origin === new URL(env.WEB_PUBLIC_URL).origin;
};
