import {
  LIMITS,
  type PreferenceProfile,
  type ViewerPreferences,
} from '@matchiq/contracts';
import { create } from 'zustand';
import { useStudioUi } from '@/features/studio/store';

export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

/** Where choices persist: the browser for the public demo, the API once signed in. */
export type PreferenceHome = 'device' | 'account';

export type PreferencesState = {
  favouriteTeamId: string | null;
  followedPlayerIds: string[];
  reducedMotion: boolean;
  /** True once stored choices (device or account) have been applied. */
  hydrated: boolean;
  home: PreferenceHome;
  saveState: SaveState;
  setFavouriteTeam: (teamId: string | null) => void;
  /** Puts the player first (in focus), keeping at most three. */
  followPlayer: (playerId: string) => void;
  unfollowPlayer: (playerId: string) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
};

export const usePreferences = create<PreferencesState>()((set) => ({
  favouriteTeamId: null,
  followedPlayerIds: [],
  reducedMotion: false,
  hydrated: false,
  home: 'device',
  saveState: 'idle',
  setFavouriteTeam: (favouriteTeamId) => set({ favouriteTeamId }),
  followPlayer: (playerId) =>
    set(({ followedPlayerIds }) => ({
      followedPlayerIds: [
        playerId,
        ...followedPlayerIds.filter((id) => id !== playerId),
      ].slice(0, LIMITS.followedPlayersMax),
    })),
  unfollowPlayer: (playerId) =>
    set(({ followedPlayerIds }) => ({
      followedPlayerIds: followedPlayerIds.filter((id) => id !== playerId),
    })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));

/** Persona and commentary language live in the studio UI store; the rest here. */
export const currentPreferences = (): ViewerPreferences => {
  const { persona, locale } = useStudioUi.getState();
  const { favouriteTeamId, followedPlayerIds, reducedMotion } =
    usePreferences.getState();
  return {
    persona,
    locale,
    favouriteTeamId,
    followedPlayerIds,
    reducedMotion,
  };
};

export const applyPreferences = (
  prefs: ViewerPreferences | PreferenceProfile,
): void => {
  useStudioUi.setState({ persona: prefs.persona, locale: prefs.locale });
  usePreferences.setState({
    favouriteTeamId: prefs.favouriteTeamId,
    followedPlayerIds: [...prefs.followedPlayerIds],
    reducedMotion: prefs.reducedMotion,
    hydrated: true,
  });
};

/** The followed player in focus for this squad, if any. */
export const focusedPlayerIn = (
  followed: readonly string[],
  squad: ReadonlySet<string>,
): string | null => followed.find((id) => squad.has(id)) ?? null;
