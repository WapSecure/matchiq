'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { REDUCED_MOTION_ATTRIBUTE } from '@/constants/preferences';
import {
  isSignedIn,
  permissionsOf,
  useSession,
} from '@/lib/auth/session-store';
import { useStudioUi } from '@/features/studio/store';
import { readLocalPreferences } from './local-preferences';
import { fetchPreferences } from './preferences-api';
import { createPreferenceSaver } from './preference-saver';
import { applyPreferences, usePreferences } from './preferences-store';

const useBeforePaint =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

const useAccountPreferences = (): boolean =>
  useSession(
    (s) =>
      isSignedIn(s.view) && permissionsOf(s.view).includes('preferences:write'),
  );

/**
 * Restores and saves viewing choices. Device choices apply before the first
 * paint, so persona and language never flash back to the defaults; a
 * signed-in user's account profile then wins, or adopts the device choices
 * the first time they sign in.
 */
export function PreferencesSync() {
  const account = useAccountPreferences();
  const saver = useRef(createPreferenceSaver());
  const reducedMotion = usePreferences((s) => s.reducedMotion);

  useBeforePaint(() => {
    const local = readLocalPreferences();
    if (local) applyPreferences(local);
    else usePreferences.setState({ hydrated: true });
  }, []);

  useEffect(() => {
    const { persist } = saver.current;
    const offUi = useStudioUi.subscribe((s, prev) => {
      if (s.persona !== prev.persona || s.locale !== prev.locale) persist();
    });
    const offPrefs = usePreferences.subscribe((s, prev) => {
      if (
        s.favouriteTeamId !== prev.favouriteTeamId ||
        s.followedPlayerIds !== prev.followedPlayerIds ||
        s.reducedMotion !== prev.reducedMotion
      )
        persist();
    });
    const current = saver.current;
    return () => {
      offUi();
      offPrefs();
      current.dispose();
    };
  }, []);

  useEffect(() => {
    if (!account) {
      usePreferences.setState({ home: 'device' });
      return;
    }
    const controller = new AbortController();
    fetchPreferences(controller.signal)
      .then((profile) => {
        usePreferences.setState({ home: 'account' });
        if (profile.updatedAt === null) return saver.current.persist();
        saver.current.markSynced(profile);
        applyPreferences(profile);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          usePreferences.setState({ saveState: 'failed' });
      });
    return () => controller.abort();
  }, [account]);

  useEffect(() => {
    document.documentElement.toggleAttribute(
      REDUCED_MOTION_ATTRIBUTE,
      reducedMotion,
    );
  }, [reducedMotion]);

  return null;
}
