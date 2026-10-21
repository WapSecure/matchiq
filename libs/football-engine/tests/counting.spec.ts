import { project, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const snap = (events: Parameters<typeof project>[1]) =>
  toSnapshot(project(fixture, events));

describe('shots and goals', () => {
  it('counts shots, shots on target and goals from GOAL only', () => {
    const s = kickedOff();
    const onTarget = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.shot('home', 'OFF_TARGET');
    s.shot('home', 'BLOCKED');
    s.shot('away', 'WOODWORK');
    s.goal('home', onTarget.eventId);
    const snapshot = snap(s.events);
    expect(snapshot.home).toMatchObject({
      shots: 3,
      shotsOnTarget: 1,
      goals: 1,
    });
    expect(snapshot.away).toMatchObject({
      shots: 1,
      shotsOnTarget: 0,
      goals: 0,
    });
    expect(snapshot.score).toEqual({ home: 1, away: 0 });
  });

  it('does not count a goal from an on-target shot alone', () => {
    const s = kickedOff();
    s.at(1, MIN).shot('home', 'ON_TARGET');
    expect(snap(s.events).score).toEqual({ home: 0, away: 0 });
  });

  it('credits an own goal to the opponent of the event team', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.goal('away', shot.eventId, true);
    const snapshot = snap(s.events);
    expect(snapshot.score).toEqual({ home: 1, away: 0 });
    expect(snapshot.home.goals).toBe(1);
    expect(snapshot.away.goals).toBe(0);
  });
});

describe('passing', () => {
  it('computes completion % to one decimal with numerator and denominator', () => {
    const s = kickedOff();
    const a1 = s.at(1, MIN).pass('home');
    s.completed('home', a1.eventId);
    const a2 = s.pass('home');
    s.completed('home', a2.eventId);
    s.pass('home');
    const snapshot = snap(s.events);
    expect(snapshot.home.passesAttempted).toBe(3);
    expect(snapshot.home.passesCompleted).toBe(2);
    expect(snapshot.home.passCompletionPct).toEqual({
      status: 'available',
      value: 66.7,
      unit: 'percent',
      numerator: 2,
      denominator: 3,
    });
  });

  it('is unavailable with a zero denominator rather than zero-filled', () => {
    const s = kickedOff();
    s.at(1, MIN).pass('home');
    expect(snap(s.events).away.passCompletionPct).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });

  it('ignores completions without a known same-team attempt and duplicate completions', () => {
    const s = kickedOff();
    const attempt = s.at(1, MIN).pass('home');
    s.completed('home', attempt.eventId);
    s.completed('home', attempt.eventId);
    s.completed('home', 'ev_unknown');
    s.completed('away', attempt.eventId);
    const snapshot = snap(s.events);
    expect(snapshot.home.passesCompleted).toBe(1);
    expect(snapshot.away.passesCompleted).toBe(0);
    expect(snapshot.home.passCompletionPct).toMatchObject({ value: 100 });
  });
});

describe('defensive and discipline counts', () => {
  it('counts pressures, recoveries, final-third entries and fouls', () => {
    const s = kickedOff();
    s.at(1, MIN).pressure('home');
    s.pressure('home');
    s.recovery('home', 30);
    s.recovery('home', 75);
    s.entry('away');
    s.foul('away');
    s.foul('away');
    const snapshot = snap(s.events);
    expect(snapshot.home).toMatchObject({ pressures: 2, recoveries: 2 });
    expect(snapshot.away).toMatchObject({ finalThirdEntries: 1, fouls: 2 });
  });

  it('counts a second yellow as a caution and a dismissal', () => {
    const s = kickedOff();
    s.at(1, MIN).card('home', 'YELLOW');
    s.card('home', 'SECOND_YELLOW');
    s.card('away', 'RED');
    const snapshot = snap(s.events);
    expect(snapshot.home).toMatchObject({ yellowCards: 2, redCards: 1 });
    expect(snapshot.away).toMatchObject({ yellowCards: 0, redCards: 1 });
  });

  it('ignores team events for a team outside the fixture', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home');
    const foreign = {
      ...shot,
      sequence: shot.sequence + 1,
      eventId: 'ev_foreign',
      teamId: 'tm_other',
    };
    const snapshot = snap([...s.events, foreign]);
    expect(snapshot.home.shots + snapshot.away.shots).toBe(1);
  });
});
