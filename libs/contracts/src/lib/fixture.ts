import { z } from 'zod';
import { LIMITS, MESSAGES, PATTERNS } from './constants.js';
import {
  FixtureId,
  PlayerId,
  Provenance,
  SchemaVersion,
  TeamId,
  UtcTimestamp,
} from './primitives.js';

export const PlayerPosition = z.enum(['GK', 'DF', 'MF', 'FW']);

export const Player = z
  .strictObject({
    playerId: PlayerId,
    teamId: TeamId,
    displayName: z.string().min(1).max(64),
    shirtNumber: z.int().min(1).max(LIMITS.shirtNumberMax),
    position: PlayerPosition,
    starting: z.boolean(),
    synthetic: z.literal(true),
  })
  .meta({ id: 'Player' });

const HexColor = z.string().regex(PATTERNS.hexColor);

export const Team = z
  .strictObject({
    teamId: TeamId,
    name: z.string().min(1).max(64),
    shortName: z.string().regex(PATTERNS.teamShortName),
    colors: z.strictObject({ primary: HexColor, secondary: HexColor }),
    formation: z.string().regex(PATTERNS.formation),
    players: z.array(Player).min(LIMITS.squadMin).max(LIMITS.squadMax),
    synthetic: z.literal(true),
  })
  .meta({ id: 'Team' });

export const FixtureStatus = z.enum([
  'SCHEDULED',
  'LIVE',
  'COMPLETED',
  'ABANDONED',
]);

/** Pitch size used to convert normalised coordinates to metres. */
export const PitchDimensions = z.strictObject({
  lengthM: z.number().min(90).max(120),
  widthM: z.number().min(45).max(90),
});

type TeamInput = z.infer<typeof Team>;
type Side = 'home' | 'away';

const checkSquad = (
  side: Side,
  team: TeamInput,
  seenPlayers: Set<string>,
  ctx: z.RefinementCtx,
): void => {
  const shirtNumbers = new Set<number>();
  let starters = 0;

  team.players.forEach((player, index) => {
    const path = [side, 'players', index];
    if (player.teamId !== team.teamId) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'teamId'],
        message: MESSAGES.wrongTeam(player.teamId, team.teamId),
      });
    }
    if (seenPlayers.has(player.playerId)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'playerId'],
        message: MESSAGES.duplicatePlayer,
      });
    }
    if (shirtNumbers.has(player.shirtNumber)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'shirtNumber'],
        message: MESSAGES.duplicateShirt,
      });
    }
    seenPlayers.add(player.playerId);
    shirtNumbers.add(player.shirtNumber);
    if (player.starting) starters += 1;
  });

  if (starters !== LIMITS.startersPerTeam) {
    ctx.addIssue({
      code: 'custom',
      path: [side, 'players'],
      message: MESSAGES.starterCount(LIMITS.startersPerTeam, starters),
    });
  }
};

export const Fixture = z
  .strictObject({
    schemaVersion: SchemaVersion,
    fixtureId: FixtureId,
    title: z.string().min(1).max(120),
    competitionLabel: z.string().min(1).max(80),
    kickoffUtc: UtcTimestamp,
    status: FixtureStatus,
    home: Team,
    away: Team,
    pitch: PitchDimensions,
    provenance: Provenance,
  })
  .superRefine((fixture, ctx) => {
    if (fixture.home.teamId === fixture.away.teamId) {
      ctx.addIssue({
        code: 'custom',
        path: ['away', 'teamId'],
        message: MESSAGES.distinctTeams,
      });
    }
    const seenPlayers = new Set<string>();
    checkSquad('home', fixture.home, seenPlayers, ctx);
    checkSquad('away', fixture.away, seenPlayers, ctx);
  });

export type PlayerPosition = z.infer<typeof PlayerPosition>;
export type Player = z.infer<typeof Player>;
export type Team = z.infer<typeof Team>;
export type FixtureStatus = z.infer<typeof FixtureStatus>;
export type PitchDimensions = z.infer<typeof PitchDimensions>;
export type Fixture = z.infer<typeof Fixture>;
