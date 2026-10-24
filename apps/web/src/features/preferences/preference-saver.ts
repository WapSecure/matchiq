import type { ViewerPreferences } from '@matchiq/contracts';
import { PREFERENCES_SAVE_DEBOUNCE_MS } from '@/constants/preferences';
import { writeLocalPreferences } from './local-preferences';
import { savePreferences } from './preferences-api';
import { currentPreferences, usePreferences } from './preferences-store';

/** Field order is fixed so equal profiles always compare equal. */
const keyOf = (p: ViewerPreferences): string =>
  JSON.stringify([
    p.persona,
    p.locale,
    p.favouriteTeamId,
    p.followedPlayerIds,
    p.reducedMotion,
  ]);

export type PreferenceSaver = {
  /** Records what the account already holds, so applying it saves nothing. */
  markSynced: (prefs: ViewerPreferences) => void;
  /** Writes to this device now and, for signed-in users, to the account after a pause. */
  persist: () => void;
  dispose: () => void;
};

export const createPreferenceSaver = (
  save: (prefs: ViewerPreferences) => Promise<unknown> = savePreferences,
  delayMs: number = PREFERENCES_SAVE_DEBOUNCE_MS,
): PreferenceSaver => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let synced: string | null = null;

  const flush = async (prefs: ViewerPreferences, key: string) => {
    usePreferences.setState({ saveState: 'saving' });
    try {
      await save(prefs);
      synced = key;
      usePreferences.setState({ saveState: 'saved' });
    } catch {
      usePreferences.setState({ saveState: 'failed' });
    }
  };

  return {
    markSynced: (prefs) => {
      synced = keyOf(prefs);
    },
    persist: () => {
      const prefs = currentPreferences();
      writeLocalPreferences(prefs);
      if (usePreferences.getState().home !== 'account') return;
      const key = keyOf(prefs);
      clearTimeout(timer);
      if (key === synced) return;
      timer = setTimeout(() => void flush(prefs, key), delayMs);
    },
    dispose: () => clearTimeout(timer),
  };
};
