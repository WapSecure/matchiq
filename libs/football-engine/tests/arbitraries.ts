import type { MatchEvent } from '@matchiq/contracts';
import fc from 'fast-check';
import { kickedOff, TEAM, type TestSide } from './builders.js';

const ACTIONS = [
  'pass',
  'complete',
  'shot',
  'shotOnTarget',
  'goal',
  'ownGoal',
  'pressure',
  'recovery',
  'highRecovery',
  'entry',
  'foul',
  'yellow',
  'secondYellow',
  'red',
  'possession',
  'contested',
  'halfTime',
  'void',
] as const;

type Action = {
  kind: (typeof ACTIONS)[number];
  side: TestSide;
  dt: number;
  pick: number;
};

const actionArb: fc.Arbitrary<Action> = fc.record({
  kind: fc.constantFrom(...ACTIONS),
  side: fc.constantFrom<TestSide>('home', 'away'),
  dt: fc.integer({ min: 0, max: 90_000 }),
  pick: fc.nat(),
});

const pickFrom = (ids: readonly string[], pick: number): string =>
  ids[pick % Math.max(ids.length, 1)] ?? 'ev_missing';

interface BuildState {
  readonly s: ReturnType<typeof kickedOff>;
  period: number;
  clock: number;
  readonly attempts: string[];
  readonly shots: string[];
}

type Step = (b: BuildState, a: Action) => void;

const STEPS: Record<Action['kind'], Step> = {
  pass: (b, a) => void b.attempts.push(b.s.pass(a.side).eventId),
  complete: (b, a) => void b.s.completed(a.side, pickFrom(b.attempts, a.pick)),
  shot: (b, a) => void b.shots.push(b.s.shot(a.side, 'OFF_TARGET').eventId),
  shotOnTarget: (b, a) =>
    void b.shots.push(b.s.shot(a.side, 'ON_TARGET').eventId),
  goal: (b, a) => void b.s.goal(a.side, pickFrom(b.shots, a.pick)),
  ownGoal: (b, a) => void b.s.goal(a.side, pickFrom(b.shots, a.pick), true),
  pressure: (b, a) => void b.s.pressure(a.side),
  recovery: (b, a) => void b.s.recovery(a.side, 30),
  highRecovery: (b, a) => void b.s.recovery(a.side, 75),
  entry: (b, a) => void b.s.entry(a.side),
  foul: (b, a) => void b.s.foul(a.side),
  yellow: (b, a) => void b.s.card(a.side, 'YELLOW'),
  secondYellow: (b, a) => void b.s.card(a.side, 'SECOND_YELLOW'),
  red: (b, a) => void b.s.card(a.side, 'RED'),
  possession: (b, a) => void b.s.possession(a.side),
  contested: (b) => void b.s.possession(null),
  halfTime: (b) => {
    if (b.period !== 1) return;
    b.s.periodEnded();
    b.period = 2;
    b.clock = 0;
    b.s.at(b.period, b.clock).periodStarted();
  },
  void: (b, a) =>
    void b.s.voids(
      pickFrom(
        b.s.events.map((e) => e.eventId),
        a.pick,
      ),
    ),
};

/** Valid-ish streams: contract-valid events, plausible but unconstrained football. */
const build = (actions: readonly Action[]): MatchEvent[] => {
  const b: BuildState = {
    s: kickedOff(),
    period: 1,
    clock: 0,
    attempts: [],
    shots: [],
  };
  for (const a of actions) {
    b.clock += a.dt;
    b.s.at(b.period, b.clock);
    STEPS[a.kind](b, a);
  }
  return b.s.events;
};

export const streamArb: fc.Arbitrary<MatchEvent[]> = fc
  .array(actionArb, { maxLength: 150, size: 'max' })
  .map(build);

/** Independent oracle for the score: non-voided GOALs, own goals to the opponent. */
export const expectedScore = (events: readonly MatchEvent[]) => {
  const voided = new Set(
    events.flatMap((e) =>
      e.type === 'CORRECTION' ? [e.correctedEventId] : [],
    ),
  );
  const score = { home: 0, away: 0 };
  for (const e of events) {
    if (e.type !== 'GOAL' || voided.has(e.eventId)) continue;
    const scorer: TestSide = e.teamId === TEAM.home ? 'home' : 'away';
    const credited = e.ownGoal ? (scorer === 'home' ? 'away' : 'home') : scorer;
    score[credited] += 1;
  }
  return score;
};
