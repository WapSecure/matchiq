export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export const THEME_STORAGE_KEY = 'matchiq.theme';
/** Set on `<html>` only for an explicit choice; absent means follow the OS. */
export const THEME_ATTRIBUTE = 'data-theme';
export const THEME_CHANGE_EVENT = 'matchiq:themechange';
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
export const LIGHT_SCHEME_QUERY = '(prefers-color-scheme: light)';

/** Browser chrome colours; they match `--color-canvas` in each theme. */
export const THEME_CHROME = { light: '#f3f5f8', dark: '#080a0e' } as const;

export const THEME_COPY = {
  legend: 'Colour theme',
  options: { light: 'Light', dark: 'Dark', system: 'System' },
  cycle: (current: string, next: string) =>
    `Colour theme: ${current}. Switch to ${next}`,
} as const;
