import { useSyncExternalStore } from 'react';
import {
  DARK_SCHEME_QUERY,
  type ResolvedTheme,
  THEME_ATTRIBUTE,
  THEME_CHANGE_EVENT,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/constants/theme';

const isPreference = (value: unknown): value is ThemePreference =>
  THEME_PREFERENCES.includes(value as ThemePreference);

export const readPreference = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const darkQuery = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_SCHEME_QUERY)
    : null;

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference !== 'system') return preference;
  return darkQuery()?.matches ? 'dark' : 'light';
};

/** Persists the choice and applies it to `<html>` without a reload. */
export const setPreference = (preference: ThemePreference): void => {
  const root = document.documentElement;
  if (preference === 'system') root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, preference);
  try {
    if (preference === 'system')
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* The choice still applies for this page view. */
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
};

const subscribe = (notify: () => void) => {
  const media = darkQuery();
  window.addEventListener(THEME_CHANGE_EVENT, notify);
  window.addEventListener('storage', notify);
  media?.addEventListener('change', notify);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, notify);
    window.removeEventListener('storage', notify);
    media?.removeEventListener('change', notify);
  };
};

const SERVER_PREFERENCE: ThemePreference = 'system';

export const useThemePreference = (): ThemePreference =>
  useSyncExternalStore(subscribe, readPreference, () => SERVER_PREFERENCE);

/** The theme actually showing; `null` on the server, where it is unknown. */
export const useResolvedTheme = (): ResolvedTheme | null =>
  useSyncExternalStore(
    subscribe,
    () => resolveTheme(readPreference()),
    () => null,
  );
