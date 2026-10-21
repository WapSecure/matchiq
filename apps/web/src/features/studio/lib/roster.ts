import type { Fixture } from '@matchiq/contracts';
import type { Side } from '@/components/match/team-swatch';

export type RosterTeam = { side: Side; name: string; shortName: string };

export type Roster = {
  team: (teamId: string | null | undefined) => RosterTeam | null;
  player: (playerId: string | null | undefined) => string | null;
};

/** Lookup tables built once per fixture so render paths stay O(1). */
export const buildRoster = (fixture: Fixture | undefined): Roster => {
  const teams = new Map<string, RosterTeam>();
  const players = new Map<string, string>();
  if (fixture) {
    for (const side of ['home', 'away'] as const) {
      const team = fixture[side];
      teams.set(team.teamId, {
        side,
        name: team.name,
        shortName: team.shortName,
      });
      for (const p of team.players) {
        players.set(p.playerId, `${p.displayName} (${p.shirtNumber})`);
      }
    }
  }
  return {
    team: (id) => (id ? (teams.get(id) ?? null) : null),
    player: (id) => (id ? (players.get(id) ?? null) : null),
  };
};
