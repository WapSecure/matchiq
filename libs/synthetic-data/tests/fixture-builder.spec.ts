import { Fixture } from '@matchiq/contracts';
import fc from 'fast-check';
import {
  SCENARIOS,
  SCENARIO_NAMES,
  buildFixture,
  createRng,
} from '../src/index.js';

const build = (seed: number, scenario: (typeof SCENARIO_NAMES)[number]) =>
  buildFixture({ rng: createRng(seed), seed, scenario: SCENARIOS[scenario] });

describe('buildFixture', () => {
  it('always satisfies the Fixture contract, including squad refinements', () => {
    fc.assert(
      fc.property(
        fc.nat(),
        fc.constantFrom(...SCENARIO_NAMES),
        (seed, scenario) => {
          const result = Fixture.safeParse(build(seed, scenario));
          expect(result.error?.issues ?? []).toEqual([]);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('builds 18-player squads that match the declared formation', () => {
    const fixture = build(42, 'comeback');
    for (const team of [fixture.home, fixture.away]) {
      expect(team.players).toHaveLength(18);
      const starters = team.players.filter((p) => p.starting);
      expect(starters).toHaveLength(11);
      const lines = team.formation.split('-').map(Number);
      const counts = { DF: 0, MF: 0, FW: 0, GK: 0 };
      for (const p of starters) counts[p.position] += 1;
      expect(counts.GK).toBe(1);
      expect(counts.DF).toBe(lines[0]);
      expect(counts.FW).toBe(lines.at(-1));
      expect(counts.MF).toBe(10 - counts.DF - counts.FW);
      expect(starters.find((p) => p.position === 'GK')?.shirtNumber).toBe(1);
      expect(new Set(team.players.map((p) => p.displayName)).size).toBe(18);
      expect(team.players.every((p) => p.synthetic)).toBe(true);
    }
  });

  it('marks provenance and labels the competition as synthetic', () => {
    const fixture = build(7, 'low-event');
    expect(fixture.provenance).toEqual({
      kind: 'synthetic',
      generatorVersion: '0.1.0',
      seed: 7,
      scenario: 'low-event',
    });
    expect(fixture.competitionLabel).toMatch(/synthetic|simulated/i);
    expect(fixture.home.synthetic && fixture.away.synthetic).toBe(true);
    expect(fixture.home.shortName).not.toBe(fixture.away.shortName);
  });
});
