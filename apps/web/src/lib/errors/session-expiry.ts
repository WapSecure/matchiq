'use client';

import { create } from 'zustand';

type SessionExpiryState = { expired: boolean };

/** Set once a signed-in user's request is refused with 401; cleared by signing in again. */
export const useSessionExpiry = create<SessionExpiryState>()(() => ({
  expired: false,
}));

export const markSessionExpired = (): void => {
  if (!useSessionExpiry.getState().expired)
    useSessionExpiry.setState({ expired: true });
};
