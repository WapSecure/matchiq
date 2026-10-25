import { MatchSnapshot } from '@matchiq/contracts';
import { detectKeyMoments, project, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const SEC = 1_000;

/**
 * Golden fixture "late comeback": away lead, home red card, home pressure
 * spell and two late goals (one an own goal), plus a voided away goal.
 */
const comeback = () => {
  const s = kickedOff();
  s.at(1, 0).possession('home');
  const a1 = s.at(1, 2 * MIN).pass('home');
  s.completed('home', a1.eventId);
  s.at(1, 4 * MIN).possession('away');
  const awayShot = s.at(1, 6 * MIN).shot('away', 'ON_TARGET');
  s.goal('away', awayShot.eventId);
  s.at(1, 7 * MIN).possession(null);
  s.at(1, 8 * MIN).possession('home');
  s.at(1, 30 * MIN).card('home', 'YELLOW');
  s.at(1, 45 * MIN).periodEnded();
  s.at(2, 0).periodStarted();
  s.possession('away');
  const disallowedShot = s.at(2, 5 * MIN).shot('away', 'ON_TARGET');
  const disallowed = s.goal('away', disallowedShot.eventId);
  s.at(2, 6 * MIN).voids(disallowed.eventId);
  s.at(2, 10 * MIN).card('home', 'SECOND_YELLOW');
  s.possession('home');
  let t = 30 * MIN;
  for (let i = 0; i < 3; i += 1) s.at(2, (t += 30 * SEC)).recovery('home', 70);
  for (let i = 0; i < 2; i += 1) s.at(2, (t += 30 * SEC)).entry('home');
  const equaliser = s.at(2, (t += 30 * SEC)).shot('home', 'ON_TARGET');
  s.goal('home', equaliser.eventId);
  s.at(2, (t += 30 * SEC)).shot('home', 'BLOCKED');
  const winner = s.at(2, (t += 30 * SEC)).shot('home', 'ON_TARGET');
  s.goal('away', winner.eventId, true);
  s.at(2, 45 * MIN).periodEnded();
  s.matchEnded();
  return s;
};

describe('golden: zero-event match', () => {
  it('has an exact, pinned empty snapshot', () => {
    const snapshot = MatchSnapshot.parse(toSnapshot(project(fixture, [])));
    expect(snapshot.stateHash).toBe(GOLDEN_HASH.empty);
    expect(detectKeyMoments(project(fixture, []))).toEqual([]);
  });
});

describe('golden: late comeback', () => {
  const snapshot = MatchSnapshot.parse(
    toSnapshot(project(fixture, comeback().events)),
  );

  it('has exact final values', () => {
    expect(snapshot).toMatchObject({
      throughSequence: 30,
      phase: 'COMPLETED',
      period: 2,
      matchClockMs: 45 * MIN,
      score: { home: 2, away: 1 },
      provisional: false,
    });
    expect(snapshot.home).toMatchObject({
      goals: 2,
      shots: 3,
      shotsOnTarget: 2,
      passesAttempted: 1,
      passesCompleted: 1,
      passCompletionPct: { status: 'available', value: 100 },
      recoveries: 3,
      finalThirdEntries: 2,
      yellowCards: 2,
      redCards: 1,
      possessionBasis: 'TIME_WEIGHTED',
    });
    expect(snapshot.away).toMatchObject({
      goals: 1,
      shots: 2,
      shotsOnTarget: 2,
      passCompletionPct: { status: 'unavailable', reason: 'ZERO_DENOMINATOR' },
      redCards: 0,
    });
    // home: 4 + 37 (1st) + 35 (2nd) = 76 min; away: 3 + 10 = 13 min; 1 min contested
    expect(snapshot.home.possessionPct).toMatchObject({
      value: 85.4,
      numerator: 76 * MIN,
      denominator: 89 * MIN,
    });
    expect(snapshot.away.possessionPct).toMatchObject({ value: 14.6 });
  });

  it('has a pinned stateHash', () => {
    expect(snapshot.stateHash).toBe(GOLDEN_HASH.comeback);
  });

  it('has the exact key-moment sequence', () => {
    const insights = detectKeyMoments(project(fixture, comeback().events));
    expect(
      insights.map((i) => [i.kind, i.priority, i.reasonCode, i.matchClockMs]),
    ).toEqual([
      ['PLAYER_MILESTONE', 'P2', 'FIRST_SHOT_ON_TARGET', 6 * MIN],
      ['GOAL', 'P0', 'GOAL_SCORED', 6 * MIN],
      ['PLAYER_MILESTONE', 'P2', 'FIRST_GOAL', 6 * MIN],
      ['PLAYER_MILESTONE', 'P2', 'FIRST_YELLOW_CARD', 30 * MIN],
      ['RED_CARD', 'P0', 'SECOND_YELLOW_DISMISSAL', 10 * MIN],
      ['HIGH_REGAINS', 'P1', 'HIGH_REGAINS_THRESHOLD', 31 * MIN + 30 * SEC],
      ['PLAYER_MILESTONE', 'P2', 'FIRST_SHOT_ON_TARGET', 33 * MIN],
      ['GOAL', 'P0', 'GOAL_SCORED', 33 * MIN],
      ['PLAYER_MILESTONE', 'P2', 'FIRST_GOAL', 33 * MIN],
      ['SHOT_BURST', 'P1', 'SHOT_BURST_THRESHOLD', 34 * MIN],
      ['GOAL', 'P0', 'OWN_GOAL_SCORED', 34 * MIN],
    ]);
    const last = insights.at(-1);
    expect(last?.evidence.computedMetrics).toMatchObject({
      'goals.home': 2,
      'goals.away': 1,
      'shots.home.rolling5m': 3,
      'highRecoveries.home.rolling5m': 3,
    });
  });
});

/**
 * Pinned at ALGORITHM_VERSION 1.1.0 (MQ-086 added shotConversionPct and passQualityPct). A change here means replay output changed:
 * bump ALGORITHM_VERSION and re-pin deliberately, never silently.
 */
const GOLDEN_HASH = {
  empty: '4223958851a87050291126c233097c4d045b25b9f27264b4f167cb1c766519fc',
  comeback: '946d828fda5be21393ae67d58b6561cc7972e2bfa828bb98f2ff197db02c42c6',
} as const;
