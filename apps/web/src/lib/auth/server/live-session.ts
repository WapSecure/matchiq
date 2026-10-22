import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_LIMITS } from '@/constants/auth';
import type { OidcSettings } from './env';
import { refreshSession } from './oidc';
import {
  clearSession,
  readSession,
  type WebSession,
  writeSession,
} from './session';

export type LiveSession =
  | { readonly kind: 'none' }
  | { readonly kind: 'expired' }
  | {
      readonly kind: 'active';
      readonly session: WebSession;
      readonly refreshed: boolean;
    };

const needsRefresh = (session: WebSession): boolean =>
  session.accessTokenExpiresAt - Math.floor(Date.now() / 1_000) <=
  AUTH_LIMITS.refreshLeewaySeconds;

/** Reads the session and refreshes its access token shortly before expiry. */
export const liveSession = async (
  request: NextRequest,
  env: OidcSettings,
): Promise<LiveSession> => {
  const session = await readSession(request, env);
  if (session === null) return { kind: 'none' };
  if (!needsRefresh(session))
    return { kind: 'active', session, refreshed: false };
  try {
    const next = await refreshSession(env, session);
    return next
      ? { kind: 'active', session: next, refreshed: true }
      : { kind: 'expired' };
  } catch {
    return { kind: 'expired' };
  }
};

/** Persists a refreshed session or clears an expired one on the response. */
export const settle = async (
  response: NextResponse,
  env: OidcSettings,
  live: LiveSession,
): Promise<NextResponse> => {
  if (live.kind === 'expired') clearSession(response, env);
  if (live.kind === 'active' && live.refreshed)
    await writeSession(response, env, live.session);
  return response;
};
