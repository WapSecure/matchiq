import type { Fixture, Player, PlayerPosition, Team } from '@matchiq/contracts';
import {
  BENCH,
  FIXTURE_DEFAULTS,
  FORMATIONS,
  GENERATOR_VERSION,
  ID_FORMAT,
  SHIRT_POOL,
  TEAM_COLOURS,
} from './constants.js';
import { NAME_PARTS } from './name-parts.js';
import type { Rng } from './prng.js';
import type { Formation, ScenarioPreset } from './types.js';

interface ClubIdentity {
  readonly city: string;
  readonly name: string;
}

const SHORT_NAME_LENGTH = 3;

const syllableName = (
  rng: Rng,
  starts: readonly string[],
  ends: readonly string[],
): string => `${rng.pick(starts)}${rng.pick(ends)}`;

const clubIdentity = (rng: Rng, takenCities: Set<string>): ClubIdentity => {
  let city = syllableName(rng, NAME_PARTS.cityStarts, NAME_PARTS.cityEnds);
  while (
    takenCities.has(city) ||
    [...takenCities].some(
      (t) => t.slice(0, SHORT_NAME_LENGTH) === city.slice(0, SHORT_NAME_LENGTH),
    )
  ) {
    city = syllableName(rng, NAME_PARTS.cityStarts, NAME_PARTS.cityEnds);
  }
  takenCities.add(city);
  return { city, name: `${city} ${rng.pick(NAME_PARTS.clubSuffixes)}` };
};

const lineup = (formation: Formation): PlayerPosition[] => {
  const slots = FORMATIONS[formation];
  const repeat = (position: PlayerPosition, count: number) =>
    Array.from({ length: count }, () => position);
  return [
    'GK',
    ...repeat('DF', slots.DF),
    ...repeat('MF', slots.MF),
    ...repeat('FW', slots.FW),
  ];
};

const bench = (): PlayerPosition[] =>
  (Object.entries(BENCH) as [PlayerPosition, number][]).flatMap(
    ([position, count]) => Array.from({ length: count }, () => position),
  );

const shirtNumbers = (rng: Rng, count: number): number[] => {
  const pool = Array.from(
    { length: SHIRT_POOL.max - SHIRT_POOL.min + 1 },
    (_, i) => i + SHIRT_POOL.min,
  );
  return [1, ...rng.shuffle(pool).slice(0, count - 1)];
};

const buildTeam = (
  rng: Rng,
  identity: ClubIdentity,
  formation: Formation,
  colours: Team['colors'],
): Team => {
  const slug = identity.city.toLowerCase();
  const teamId = ID_FORMAT.team(slug);
  const starters = lineup(formation);
  const positions = [...starters, ...bench()];
  const numbers = shirtNumbers(rng, positions.length);
  const usedNames = new Set<string>();
  const players: Player[] = positions.map((position, index) => {
    const shirtNumber = numbers[index] ?? index + 1;
    let displayName = '';
    while (displayName === '' || usedNames.has(displayName)) {
      displayName = `${syllableName(rng, NAME_PARTS.givenStarts, NAME_PARTS.givenEnds)} ${syllableName(rng, NAME_PARTS.familyStarts, NAME_PARTS.familyEnds)}`;
    }
    usedNames.add(displayName);
    return {
      playerId: ID_FORMAT.player(slug, shirtNumber),
      teamId,
      displayName,
      shirtNumber,
      position,
      starting: index < starters.length,
      synthetic: true,
    };
  });
  return {
    teamId,
    name: identity.name,
    shortName: identity.city.slice(0, SHORT_NAME_LENGTH).toUpperCase(),
    colors: { ...colours },
    formation,
    players,
    synthetic: true,
  };
};

export interface BuildFixtureOptions {
  readonly rng: Rng;
  readonly seed: number;
  readonly scenario: ScenarioPreset;
  readonly kickoffUtc?: string;
}

export const buildFixture = (options: BuildFixtureOptions): Fixture => {
  const { rng, seed, scenario } = options;
  const cities = new Set<string>();
  const homeIdentity = clubIdentity(rng, cities);
  const awayIdentity = clubIdentity(rng, cities);
  const [homeColours, awayColours] = rng.shuffle(TEAM_COLOURS);
  if (!homeColours || !awayColours) throw new RangeError('need two palettes');
  const home = buildTeam(
    rng,
    homeIdentity,
    scenario.home.formation,
    homeColours,
  );
  const away = buildTeam(
    rng,
    awayIdentity,
    scenario.away.formation,
    awayColours,
  );
  return {
    schemaVersion: 1,
    fixtureId: ID_FORMAT.fixture(scenario.name, seed),
    title: `${home.name} vs ${away.name}`,
    competitionLabel: FIXTURE_DEFAULTS.competitionLabel,
    kickoffUtc: options.kickoffUtc ?? FIXTURE_DEFAULTS.kickoffUtc,
    status: FIXTURE_DEFAULTS.status,
    home,
    away,
    pitch: { ...FIXTURE_DEFAULTS.pitch },
    provenance: {
      kind: 'synthetic',
      generatorVersion: GENERATOR_VERSION,
      seed,
      scenario: scenario.name,
    },
  };
};
