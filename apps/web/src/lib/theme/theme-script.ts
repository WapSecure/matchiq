import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/constants/theme';

/**
 * Runs in `<head>` before first paint. Kept free of outer references because
 * it is serialised with `toString()`; storage may throw in private modes.
 */
export function applyStoredTheme(key: string, attribute: string): void {
  try {
    const stored = window.localStorage.getItem(key);
    const root = document.documentElement;
    if (stored === 'light' || stored === 'dark')
      root.setAttribute(attribute, stored);
    else root.removeAttribute(attribute);
  } catch {
    /* Without storage the OS preference applies through CSS. */
  }
}

export const THEME_INIT_SCRIPT = `(${applyStoredTheme.toString()})(${JSON.stringify(THEME_STORAGE_KEY)},${JSON.stringify(THEME_ATTRIBUTE)})`;
