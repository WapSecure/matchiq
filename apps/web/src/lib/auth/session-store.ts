'use client';

import {
  ANONYMOUS_ROLE,
  type AnyRole,
  type Permission,
  ROLE_PERMISSIONS,
} from '@matchiq/access';
import { create } from 'zustand';
import { AUTH_ROUTES } from '@/constants/auth';
import { SessionView } from './session-view';

type SessionState = {
  /** Null until `/auth/session` has answered once. */
  view: SessionView | null;
  load: () => Promise<void>;
  /** The BFF answered 401: the session ended server-side. */
  markExpired: () => void;
};

const SIGNED_OUT: SessionView = { status: 'anonymous', ssoEnabled: false };

const fetchView = async (): Promise<SessionView> => {
  try {
    const res = await fetch(AUTH_ROUTES.session, { cache: 'no-store' });
    const parsed = SessionView.safeParse(await res.json());
    return parsed.success ? parsed.data : SIGNED_OUT;
  } catch {
    return SIGNED_OUT;
  }
};

let pending: Promise<void> | null = null;

export const useSession = create<SessionState>()((set) => ({
  view: null,
  load: () => {
    pending ??= fetchView().then((view) => set({ view }));
    return pending;
  },
  markExpired: () =>
    set(({ view }) =>
      view?.status === 'authenticated'
        ? { view: { status: 'expired', ssoEnabled: true } }
        : {},
    ),
}));

/**
 * Resolves once an in-flight session load has answered, so a signed-in
 * user's first API call goes through the BFF rather than to the public demo.
 * Resolves at once when no load was started (tests, offline shells).
 */
export const whenSessionKnown = (): Promise<void> =>
  pending ?? Promise.resolve();

export const isSignedIn = (
  view: SessionView | null = useSession.getState().view,
) => view?.status === 'authenticated';

/** Signed out, the UI shows what the public demo may do; the API enforces it. */
export const permissionsOf = (
  view: SessionView | null,
): readonly Permission[] =>
  view?.status === 'authenticated'
    ? view.permissions
    : ROLE_PERMISSIONS[ANONYMOUS_ROLE];

export const rolesOf = (view: SessionView | null): readonly AnyRole[] =>
  view?.status === 'authenticated' ? view.user.roles : [ANONYMOUS_ROLE];

/** The UI permission seam: true when the session (or the public demo) grants it. */
export const useCan = (permission: Permission): boolean =>
  useSession((s) => permissionsOf(s.view).includes(permission));
