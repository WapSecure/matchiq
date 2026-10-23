import { ViewerPreferences } from '@matchiq/contracts';
import { PREFERENCES_STORAGE_KEY } from '@/constants/preferences';

/** Storage can be blocked (private mode, quotas): every access is guarded. */
export const readLocalPreferences = (): ViewerPreferences | null => {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = ViewerPreferences.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const writeLocalPreferences = (prefs: ViewerPreferences): void => {
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* The choice still applies for this page view. */
  }
};
