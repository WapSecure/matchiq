import { Fixture, MatchEvent } from '@matchiq/contracts';
import fc from 'fast-check';
import {
  SCENARIO_NAMES,
  generateMatch,
  hashEvents,
  validateFixtureEvents,
} from '../src/index.js';

const seedArb = fc.nat({ max: 0xffff_ffff });
const scenarioArb = fc.constantFrom(...SCENARIO_NAMES);
const RUNS = 12;

describe('generateMatch invariants (property-based)', () => {
  it('every stream parses against the contracts and passes the validator', () => {
    fc.assert(
      fc.property(seedArb, scenarioArb, (seed, scenario) => {
        const { fixture, events, score } = generateMatch({ seed, scenario });
        expect(Fixture.safeParse(fixture).success).toBe(true);
        for (const event of events)
          expect(MatchEvent.safeParse(event).success).toBe(true);
        const report = validateFixtureEvents(fixture, events);
        expect(report.issues).toEqual([]);
        expect(report.score).toEqual(score);
      }),
      { numRuns: RUNS * SCENARIO_NAMES.length },
    );
  });

  it('is deterministic: the same seed and scenario give the same hash', () => {
    fc.assert(
      fc.property(seedArb, scenarioArb, (seed, scenario) => {
        const a = generateMatch({ seed, scenario });
        const b = generateMatch({ seed, scenario });
        expect(hashEvents(b.events)).toBe(hashEvents(a.events));
        expect(b.fixture).toEqual(a.fixture);
      }),
      { numRuns: RUNS },
    );
  });

  it('different seeds give different streams', () => {
    fc.assert(
      fc.property(seedArb, seedArb, scenarioArb, (a, b, scenario) => {
        fc.pre(a !== b);
        const left = hashEvents(generateMatch({ seed: a, scenario }).events);
        const right = hashEvents(generateMatch({ seed: b, scenario }).events);
        expect(left).not.toBe(right);
      }),
      { numRuns: RUNS },
    );
  });

  it('keeps density, clocks and identifiers within the documented envelope', () => {
    fc.assert(
      fc.property(seedArb, scenarioArb, (seed, scenario) => {
        const { events } = generateMatch({ seed, scenario });
        expect(events.length).toBeGreaterThanOrEqual(800);
        expect(events.length).toBeLessThanOrEqual(1750);
        events.forEach((event, index) => {
          expect(event.sequence).toBe(index);
          expect(event.eventId).toBe(
            `ev_${String(index + 1).padStart(6, '0')}`,
          );
          expect(event.provenance).toEqual({
            kind: 'synthetic',
            generatorVersion: '0.1.0',
            seed,
            scenario,
          });
          const previous = events[index - 1];
          if (previous?.period === event.period) {
            expect(event.matchClockMs).toBeGreaterThanOrEqual(
              previous.matchClockMs,
            );
          }
        });
        expect(events.at(0)?.type).toBe('MATCH_STARTED');
        expect(events.at(-1)?.type).toBe('MATCH_ENDED');
      }),
      { numRuns: RUNS * 2 },
    );
  });

  it('only changes the score through GOAL events that link an on-target shot', () => {
    fc.assert(
      fc.property(seedArb, scenarioArb, (seed, scenario) => {
        const { events, score, fixture } = generateMatch({ seed, scenario });
        const byId = new Map(events.map((e) => [e.eventId, e]));
        const goals = events.filter((e) => e.type === 'GOAL');
        for (const goal of goals) {
          const shot = byId.get(goal.shotEventId);
          expect(shot?.type).toBe('SHOT');
          expect(shot !== undefined && shot.sequence < goal.sequence).toBe(
            true,
          );
          if (shot?.type === 'SHOT') expect(shot.outcome).toBe('ON_TARGET');
        }
        const homeGoals = goals.filter(
          (g) => g.teamId === fixture.home.teamId,
        ).length;
        expect(score).toEqual({
          home: homeGoals,
          away: goals.length - homeGoals,
        });
      }),
      { numRuns: RUNS * 2 },
    );
  });

  it('never lets a dismissed or substituted-off player act again', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.constantFrom('red-card-swing', 'high-press'),
        (seed, scenario) => {
          const { events } = generateMatch({ seed, scenario });
          const gone = new Set<string>();
          for (const event of events) {
            if ('playerId' in event && event.playerId !== undefined) {
              expect(gone.has(event.playerId)).toBe(false);
            }
            if (event.type === 'SUBSTITUTION') gone.add(event.playerOutId);
            if (event.type === 'CARD' && event.card !== 'YELLOW')
              gone.add(event.playerId);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe('scenario outcomes hold for every seed', () => {
  const minuteOf = (event: MatchEvent): number =>
    (event.period - 1) * 45 + event.matchClockMs / 60_000;

  it('comeback: away leads 0-2, home wins 3-2 with the winner late', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const { events, score, fixture } = generateMatch({
          seed,
          scenario: 'comeback',
        });
        expect(score).toEqual({ home: 3, away: 2 });
        const goals = events.filter((e) => e.type === 'GOAL');
        expect(
          goals.slice(0, 2).every((g) => g.teamId === fixture.away.teamId),
        ).toBe(true);
        const winner = goals.at(-1);
        expect(winner?.teamId).toBe(fixture.home.teamId);
        if (winner !== undefined)
          expect(minuteOf(winner)).toBeGreaterThanOrEqual(85);
      }),
      { numRuns: RUNS },
    );
  });

  it('possession-dominance: 0-0 with the home side holding most of the ball', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const { events, score, fixture } = generateMatch({
          seed,
          scenario: 'possession-dominance',
        });
        expect(score).toEqual({ home: 0, away: 0 });
        const passes = events.filter((e) => e.type === 'PASS_COMPLETED');
        const home = passes.filter(
          (e) => e.teamId === fixture.home.teamId,
        ).length;
        expect(home / passes.length).toBeGreaterThan(0.6);
      }),
      { numRuns: RUNS },
    );
  });

  it('red-card-swing: home leads, is reduced to ten, and loses 1-2', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const { events, score, fixture } = generateMatch({
          seed,
          scenario: 'red-card-swing',
        });
        expect(score).toEqual({ home: 1, away: 2 });
        const dismissals = events.filter(
          (e) => e.type === 'CARD' && e.card !== 'YELLOW',
        );
        expect(dismissals).toHaveLength(1);
        expect(dismissals[0]).toMatchObject({
          card: 'RED',
          teamId: fixture.home.teamId,
        });
        const firstGoal = events.find((e) => e.type === 'GOAL');
        expect(firstGoal?.type === 'GOAL' && firstGoal.teamId).toBe(
          fixture.home.teamId,
        );
      }),
      { numRuns: RUNS },
    );
  });

  it('high-press produces more pressure than low-event for the same seed', () => {
    fc.assert(
      fc.property(seedArb, (seed) => {
        const count = (scenario: 'high-press' | 'low-event') =>
          generateMatch({ seed, scenario }).events.filter(
            (e) => e.type === 'PRESSURE_APPLIED',
          ).length;
        expect(count('high-press')).toBeGreaterThan(count('low-event') * 2);
      }),
      { numRuns: RUNS },
    );
  });

  it('scripted scenarios have no unscripted dismissals', () => {
    fc.assert(
      fc.property(
        seedArb,
        fc.constantFrom('comeback', 'possession-dominance'),
        (seed, scenario) => {
          const { events } = generateMatch({ seed, scenario });
          const cards = events.filter((e) => e.type === 'CARD');
          expect(
            cards.every((c) => c.type === 'CARD' && c.card === 'YELLOW'),
          ).toBe(true);
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('low-event omits shot speed, the others measure it', () => {
    const shots = (scenario: 'low-event' | 'comeback') =>
      generateMatch({ seed: 42, scenario }).events.filter(
        (e) => e.type === 'SHOT',
      );
    expect(
      shots('low-event').every(
        (s) => s.type === 'SHOT' && s.speedKph === undefined,
      ),
    ).toBe(true);
    expect(
      shots('comeback').every(
        (s) => s.type === 'SHOT' && s.speedKph !== undefined,
      ),
    ).toBe(true);
  });
});
