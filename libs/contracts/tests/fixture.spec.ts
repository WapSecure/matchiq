import { Fixture } from '../src/index.js';
import { buildFixture } from './builders.js';

const issuesOf = (input: unknown) => {
  const result = Fixture.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('Fixture', () => {
  it('accepts a well-formed synthetic fixture', () => {
    expect(issuesOf(buildFixture())).toEqual([]);
  });

  it('rejects identical home and away teams', () => {
    const fixture = buildFixture();
    expect(issuesOf({ ...fixture, away: fixture.home })).toContain(
      'home and away teams must differ',
    );
  });

  it('rejects a player assigned to the other team', () => {
    const fixture = buildFixture();
    const players = fixture.home.players.map((p, i) =>
      i === 0 ? { ...p, teamId: fixture.away.teamId } : p,
    );
    const issues = issuesOf({ ...fixture, home: { ...fixture.home, players } });
    expect(issues.some((m) => m.startsWith('player belongs to'))).toBe(true);
  });

  it('rejects duplicate shirt numbers within a team', () => {
    const fixture = buildFixture();
    const players = fixture.home.players.map((p, i) =>
      i === 1 ? { ...p, shirtNumber: 1 } : p,
    );
    expect(
      issuesOf({ ...fixture, home: { ...fixture.home, players } }),
    ).toContain('duplicate shirt number within team');
  });

  it('requires exactly eleven starters per team', () => {
    const fixture = buildFixture();
    const players = fixture.away.players.map((p) => ({ ...p, starting: true }));
    expect(
      issuesOf({ ...fixture, away: { ...fixture.away, players } }),
    ).toContain('expected 11 starters, found 14');
  });

  it('only accepts synthetic teams and players', () => {
    const fixture = buildFixture();
    expect(
      Fixture.safeParse({
        ...fixture,
        home: { ...fixture.home, synthetic: false },
      }).success,
    ).toBe(false);
  });
});
