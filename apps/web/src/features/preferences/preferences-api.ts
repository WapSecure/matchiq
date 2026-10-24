import {
  PreferenceProfile,
  ViewerPreferences,
  type ViewerPreferences as Prefs,
} from '@matchiq/contracts';
import { PREFERENCES_API_PATH } from '@/constants/preferences';
import { requestJson } from '@/lib/api/http-client';

export const fetchPreferences = (signal?: AbortSignal) =>
  requestJson(PREFERENCES_API_PATH, PreferenceProfile, { signal });

/** A PUT replaces the profile, so a retry after a timeout is safe. */
export const savePreferences = (prefs: Prefs) =>
  requestJson(PREFERENCES_API_PATH, PreferenceProfile, {
    method: 'PUT',
    body: ViewerPreferences.parse(prefs),
  });
