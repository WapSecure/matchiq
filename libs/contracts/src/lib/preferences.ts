import { z } from 'zod';
import { LIMITS, MESSAGES } from './constants.js';
import {
  Locale,
  Persona,
  PlayerId,
  TeamId,
  UtcTimestamp,
} from './primitives.js';

/**
 * `PUT /me/preferences` body: the caller's whole viewing profile. A PUT
 * replaces it, so sending the same body twice leaves the same row.
 */
export const ViewerPreferences = z.strictObject({
  persona: Persona,
  locale: Locale,
  /** Biases the fan view towards this team; never changes a statistic. */
  favouriteTeamId: TeamId.nullable(),
  /** Most recent first; the first one in the current match is in focus. */
  followedPlayerIds: z
    .array(PlayerId)
    .max(LIMITS.followedPlayersMax)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: MESSAGES.duplicateFollowedPlayer,
    }),
  reducedMotion: z.boolean(),
});

/** `GET`/`PUT /me/preferences`: the stored profile, or the defaults when none is stored. */
export const PreferenceProfile = ViewerPreferences.extend({
  /** Null until the caller saves for the first time. */
  updatedAt: UtcTimestamp.nullable(),
});

export const DEFAULT_VIEWER_PREFERENCES = {
  persona: 'BROADCAST',
  locale: 'en-GB',
  favouriteTeamId: null,
  followedPlayerIds: [],
  reducedMotion: false,
} as const satisfies z.input<typeof ViewerPreferences>;

export type ViewerPreferences = z.infer<typeof ViewerPreferences>;
export type PreferenceProfile = z.infer<typeof PreferenceProfile>;
