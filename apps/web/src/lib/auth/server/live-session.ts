import type { NextRequest, NextResponse } from 'next/server';
import { AUTH_LIMITS } from '@/constants/auth';
import type { OidcSettings } from './env';
import { refreshSession } from './oidc';
import {
  createRefreshCoordinator,
  type RefreshCoordinator,
} from './refresh-coordinator';
import {
  clearSession,
  readSession,
  type WebSession,
  writeSession,
} from './session';

export type LiveSession =
  | { readonly kind: 'none' }
  | { readonly kind: 'expired' }
  /** The access token has expired and the issuer could not be reached; the cookie is kept. */
  | { readonly kind: 'unavailable'; readonly session: WebSession }
  | {
      readonly kind: 'active';
      readonly session: WebSession;
      readonly refreshed: boolean;
    };

const nowSeconds = () => Math.floor(Date.now() / 1_000);

/**
 * Decides what a request may do with its session. A failed refresh never
 * ends a session whose access token is still valid, and only a definitive
 * rejection by the issuer ends one whose token has expired.
 */
export const resolveLiveSession = async (
  session: WebSession,
  coordinator: RefreshCoordinator,
  now: number = nowSeconds(),
): Promise<LiveSession> => {
  const remaining = session.accessTokenExpiresAt - now;
  if (remaining > AUTH_LIMITS.refreshLeewaySeconds)
    return { kind: 'active', session, refreshed: false };
  const outcome = await coordinator.refresh(session);
  if (outcome.kind === 'refreshed')
    return { kind: 'active', session: outcome.session, refreshed: true };
  if (remaining > 0) return { kind: 'active', session, refreshed: false };
  return outcome.kind === 'rejected'
    ? { kind: 'expired' }
    : { kind: 'unavailable', session };
};

// Kept on globalThis so every route bundle and hot reload share one coordinator.
const COORDINATOR = Symbol.for('matchiq.web.refreshCoordinator');
type CoordinatorHost = { [COORDINATOR]?: RefreshCoordinator };

const coordinatorFor = (env: OidcSettings): RefreshCoordinator => {
  const host = globalThis as CoordinatorHost;
  host[COORDINATOR] ??= createRefreshCoordinator({
    grant: (session) => refreshSession(env, session),
  });
  return host[COORDINATOR];
};

/** Reads the session and refreshes its access token shortly before expiry. */
export const liveSession = async (
  request: NextRequest,
  env: OidcSettings,
): Promise<LiveSession> => {
  const session = await readSession(request, env);
  if (session === null) return { kind: 'none' };
  return resolveLiveSession(session, coordinatorFor(env));
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
