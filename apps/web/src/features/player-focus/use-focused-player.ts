'use client';

import type { Fixture, Player } from '@matchiq/contracts';
import { useMemo } from 'react';
import {
  focusedPlayerIn,
  usePreferences,
} from '@/features/preferences/preferences-store';

export const squadOf = (fixture: Fixture): Map<string, Player> =>
  new Map(
    [...fixture.home.players, ...fixture.away.players].map((p) => [
      p.playerId,
      p,
    ]),
  );

/** The most recently followed player who is in this fixture's squads. */
export const useFocusedPlayer = (fixture: Fixture | undefined) => {
  const followed = usePreferences((s) => s.followedPlayerIds);
  const squad = useMemo(
    () => (fixture ? squadOf(fixture) : new Map<string, Player>()),
    [fixture],
  );
  const playerId = focusedPlayerIn(followed, new Set(squad.keys()));
  const followedHere = followed.filter((id) => squad.has(id));
  return {
    playerId,
    player: playerId === null ? null : (squad.get(playerId) ?? null),
    squad,
    followedHere,
  };
};
