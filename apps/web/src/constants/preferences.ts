export const PREFERENCES_STORAGE_KEY = 'matchiq.viewing-preferences.v1';
export const PREFERENCES_API_PATH = '/me/preferences';
export const REDUCED_MOTION_ATTRIBUTE = 'data-reduced-motion';

/** Quiet period before a change is saved, so a burst of choices is one save. */
export const PREFERENCES_SAVE_DEBOUNCE_MS = 600;

export const PREFERENCES_COPY = {
  favouriteTeam: 'Your team',
  favouriteTeamHint:
    'Fan view puts your team’s moments first. The numbers stay the same.',
  noFavourite: 'No favourite',
  yourTeam: 'Your team',
  reducedMotion: 'Reduce motion',
  saved: {
    account: 'Saved to your account',
    device: 'Saved on this device',
    saving: 'Saving…',
    failed: 'We couldn’t reach your account, so this is kept on this device.',
  },
} as const;
