import { CONTEXT_REFS, MomentContext, type Insight } from '@matchiq/contracts';
import {
  detectKeyMoments,
  directionOf,
  matchMinute,
  minutePhase,
  momentContext,
  precedingRegain,
  previousMoment,
  project,
  scoreFact,
  trendFact,
  windowFact,
} from '../src/index.js';
import { buildFixture, kickedOff, MIN, TEAM } from './builders.js';

const fixture = buildFixture();
const SEC = 1_000;

const entry = (period: number, clockMs: number, n = 0) => ({
  eventId: `ev_${period}_${clockMs}_${n}`,
  sequence: n,
  period,
  clockMs,
});

describe('score and time', () => {
  it('reads the scoreboard from the subject side', () => {
    expect(scoreFact({ home: 2, away: 1 }, 'home')).toEqual({
      state: 'LEADING',
      margin: 1,
    });
    expect(scoreFact({ home: 2, away: 1 }, 'away')).toEqual({
      state: 'TRAILING',
      margin: 1,
    });
    expect(scoreFact({ home: 1, away: 1 }, 'away')).toEqual({
      state: 'LEVEL',
      margin: 0,
    });
  });

  it('gives scoreboard minutes, with stoppage time as the last minute', () => {
    expect(matchMinute({ period: 1, clockMs: 0 })).toBe(1);
    expect(matchMinute({ period: 1, clockMs: 22 * MIN + 30 * SEC })).toBe(23);
    expect(matchMinute({ period: 1, clockMs: 47 * MIN })).toBe(45);
    expect(matchMinute({ period: 2, clockMs: 3 * MIN })).toBe(49);
  });

  it.each([
    [1, 5, 'EARLY'],
    [1, 20, 'FIRST_HALF'],
    [1, 40, 'BEFORE_HALF_TIME'],
    [2, 10, 'SECOND_HALF'],
    [2, 35, 'FINAL_15'],
    [3, 1, 'FINAL_15'],
  ] as const)('period %i minute %i is %s', (period, min, phase) => {
    expect(minutePhase({ period, clockMs: min * MIN })).toBe(phase);
  });
});

describe('window comparison', () => {
  it('compares the last 10 minutes with the match rate so far', () => {
    const entries = [
      entry(1, 2 * MIN),
      entry(1, 12 * MIN),
      entry(1, 15 * MIN),
      entry(1, 18 * MIN),
    ];
    // 4 in 20 minutes is 2 per 10 minutes; 3 of them came in the last 10.
    expect(windowFact(entries, { period: 1, clockMs: 20 * MIN })).toEqual({
      recent: 3,
      average: 2,
    });
  });

  it('is unavailable before 10 minutes have been played', () => {
    expect(windowFact([entry(1, MIN)], { period: 1, clockMs: 9 * MIN })).toBe(
      null,
    );
  });

  it('counts first-half stoppage time as recent early in the second half', () => {
    const entries = [entry(1, 46 * MIN), entry(2, MIN)];
    const fact = windowFact(entries, { period: 2, clockMs: 2 * MIN });
    expect(fact?.recent).toBe(2);
  });
});

describe('trend over the last three spells', () => {
  it.each([
    [[1, 2, 4], 'RISING'],
    [[4, 2, 2], 'FALLING'],
    [[3, 3, 3], 'STEADY'],
    [[1, 4, 2], 'MIXED'],
  ] as const)('%j is %s', (spells, direction) => {
    expect(directionOf(spells)).toBe(direction);
  });

  it('counts each 5-minute spell ending at the moment', () => {
    const entries = [
      entry(1, 6 * MIN),
      entry(1, 11 * MIN),
      entry(1, 12 * MIN),
      entry(1, 16 * MIN),
      entry(1, 17 * MIN),
      entry(1, 19 * MIN),
    ];
    expect(trendFact(entries, { period: 1, clockMs: 20 * MIN })).toEqual({
      spells: [1, 2, 3],
      direction: 'RISING',
    });
    expect(trendFact(entries, { period: 1, clockMs: 14 * MIN })).toBe(null);
  });
});

describe('linked events', () => {
  it('links the latest regain shortly before a goal', () => {
    const regains = [entry(1, 10 * MIN, 1), entry(1, 20 * MIN - 12 * SEC, 2)];
    expect(precedingRegain(regains, { period: 1, clockMs: 20 * MIN })).toEqual({
      eventId: regains[1]?.eventId,
      secondsBefore: 12,
    });
    expect(precedingRegain(regains, { period: 1, clockMs: 30 * MIN })).toBe(
      null,
    );
  });

  it('finds the previous moment of the same kind for the same team', () => {
    const base = { kind: 'SHOT_BURST', teamId: TEAM.home } as const;
    const prior = [
      { ...base, insightId: 'in_a', period: 1, matchClockMs: 20 * MIN },
      {
        ...base,
        insightId: 'in_b',
        teamId: TEAM.away,
        period: 1,
        matchClockMs: 25 * MIN,
      },
    ] as unknown as Insight[];
    expect(previousMoment(prior, { ...base, insightId: 'in_c' })).toEqual({
      insightId: 'in_a',
      minute: 21,
    });
    expect(
      previousMoment(prior, { ...base, kind: 'GOAL', insightId: 'in_c' }),
    ).toBe(null);
  });
});

describe('momentContext', () => {
  const lateGoal = () => {
    const s = kickedOff();
    for (let m = 1; m <= 20; m += 1) s.at(1, m * MIN).shot('away');
    s.at(1, 21 * MIN).recovery('home', 70);
    const shot = s.at(1, 21 * MIN + 10 * SEC).shot('home', 'ON_TARGET');
    s.goal('home', shot.eventId);
    return s;
  };

  it('describes a goal with score, time, comparison, trend and the regain', () => {
    const state = project(fixture, lateGoal().events);
    const insights = detectKeyMoments(state);
    const goal = insights.find((i) => i.kind === 'GOAL');
    if (goal === undefined) throw new Error('no goal');
    const context = MomentContext.parse(
      momentContext({
        derived: state.derived,
        fixture: state.fixture,
        insight: goal,
        prior: insights.filter((i) => i !== goal),
      }),
    );
    expect(context).toMatchObject({
      side: 'home',
      scoreState: 'LEADING',
      phase: 'FIRST_HALF',
      comparison: { metric: 'shots' },
      trend: { metric: 'shots', direction: 'RISING' },
      linked: { regainEventId: expect.any(String) },
    });
    expect(context.metrics).toMatchObject({
      [CONTEXT_REFS.scoreHome]: 1,
      [CONTEXT_REFS.scoreAway]: 0,
      [CONTEXT_REFS.margin]: 1,
      [CONTEXT_REFS.minute]: 22,
      [CONTEXT_REFS.windowMinutes]: 10,
      [CONTEXT_REFS.recent('home')]: 1,
      [CONTEXT_REFS.recent('away')]: 9,
      [CONTEXT_REFS.regainSeconds]: 10,
    });
    expect(context.eventIds).toEqual([context.linked.regainEventId]);
  });

  it('is deterministic', () => {
    const state = project(fixture, lateGoal().events);
    const [first] = detectKeyMoments(state);
    if (first === undefined) throw new Error('no moment');
    const input = {
      derived: state.derived,
      fixture: state.fixture,
      insight: first,
      prior: [],
    };
    expect(momentContext(input)).toEqual(momentContext(input));
  });
});
