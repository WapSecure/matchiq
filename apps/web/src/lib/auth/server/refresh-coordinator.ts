import { createHash } from 'node:crypto';
import { AUTH_LIMITS } from '@/constants/auth';
import type { WebSession } from './session';

/** The issuer refused the refresh token for good (e.g. `invalid_grant`). */
export class RefreshRejectedError extends Error {
  constructor(readonly reason: string) {
    super(reason);
    this.name = 'RefreshRejectedError';
  }
}

export type RefreshOutcome =
  | { readonly kind: 'refreshed'; readonly session: WebSession }
  | { readonly kind: 'rejected' }
  | { readonly kind: 'unavailable' };

export type RefreshGrant = (session: WebSession) => Promise<WebSession>;

/**
 * Where a rotated session is kept for its grace window. In memory by default;
 * several web instances need a shared implementation (ADR-0018 addendum).
 */
export type RefreshGraceStore = {
  get: (key: string, nowMs: number) => WebSession | undefined;
  set: (key: string, session: WebSession, expiresAtMs: number) => void;
};

export const memoryGraceStore = (
  maxEntries: number = AUTH_LIMITS.refreshGraceEntriesMax,
): RefreshGraceStore => {
  const entries = new Map<string, { session: WebSession; expiresAt: number }>();
  const evictExpired = (nowMs: number) => {
    for (const [key, entry] of entries)
      if (entry.expiresAt <= nowMs) entries.delete(key);
  };
  return {
    get: (key, nowMs) => {
      evictExpired(nowMs);
      return entries.get(key)?.session;
    },
    set: (key, session, expiresAt) => {
      entries.delete(key);
      entries.set(key, { session, expiresAt });
      // Map iteration is insertion order, so the first key is the oldest.
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
  };
};

/** Keys never contain the refresh token itself. */
export const refreshKey = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken).digest('base64url');

export type RefreshCoordinator = {
  refresh: (session: WebSession) => Promise<RefreshOutcome>;
};

type CoordinatorOptions = {
  grant: RefreshGrant;
  now?: () => number;
  graceMs?: number;
  store?: RefreshGraceStore;
};

const outcomeOf = async (
  grant: RefreshGrant,
  session: WebSession,
): Promise<RefreshOutcome> => {
  try {
    return { kind: 'refreshed', session: await grant(session) };
  } catch (error) {
    return error instanceof RefreshRejectedError
      ? { kind: 'rejected' }
      : { kind: 'unavailable' };
  }
};

/**
 * Refresh tokens rotate and are single-use, while the studio polls several
 * BFF routes at once. Concurrent refreshes of one token share a single grant,
 * and the result is kept for a grace window so a request that still carries
 * the just-rotated token gets the new session instead of `invalid_grant`.
 */
export const createRefreshCoordinator = ({
  grant,
  now = Date.now,
  graceMs = AUTH_LIMITS.refreshGraceMs,
  store = memoryGraceStore(),
}: CoordinatorOptions): RefreshCoordinator => {
  const inFlight = new Map<string, Promise<RefreshOutcome>>();
  return {
    refresh: (session) => {
      if (!session.refreshToken)
        return Promise.resolve({ kind: 'rejected' } as const);
      const key = refreshKey(session.refreshToken);
      const cached = store.get(key, now());
      if (cached)
        return Promise.resolve({ kind: 'refreshed', session: cached });
      const pending = inFlight.get(key);
      if (pending) return pending;
      const next = outcomeOf(grant, session).then((outcome) => {
        if (outcome.kind === 'refreshed')
          store.set(key, outcome.session, now() + graceMs);
        inFlight.delete(key);
        return outcome;
      });
      inFlight.set(key, next);
      return next;
    },
  };
};
