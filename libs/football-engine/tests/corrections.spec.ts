import { applyEvent, project, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const snap = (events: Parameters<typeof project>[1]) =>
  toSnapshot(project(fixture, events));

describe('CORRECTION (VOID)', () => {
  it('removes a voided goal from the score', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    const goal = s.goal('home', shot.eventId);
    s.voids(goal.eventId);
    const snapshot = snap(s.events);
    expect(snapshot.score).toEqual({ home: 0, away: 0 });
    expect(snapshot.home.shots).toBe(1);
    expect(snapshot.provisional).toBe(false);
  });

  it('equals the projection that never contained the voided event', () => {
    const s = kickedOff();
    const attempt = s.at(1, MIN).pass('home');
    s.completed('home', attempt.eventId);
    s.pass('home');
    s.card('away', 'RED');
    s.voids(attempt.eventId);
    const snapshot = snap(s.events);
    expect(snapshot.home.passesAttempted).toBe(1);
    expect(snapshot.home.passesCompleted).toBe(0);
    expect(snapshot.home.passCompletionPct).toMatchObject({ value: 0 });
    expect(snapshot.away.redCards).toBe(1);
  });

  it('applies an amendment as a void plus a new event', () => {
    const s = kickedOff();
    const wrong = s.at(1, MIN).card('home', 'RED');
    s.voids(wrong.eventId);
    s.card('home', 'YELLOW');
    const snapshot = snap(s.events);
    expect(snapshot.home).toMatchObject({ redCards: 0, yellowCards: 1 });
  });

  it('is provisional while the corrected event has not arrived, then applies the void', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    const goal = s.goal('home', shot.eventId);
    const correction = s.voids(goal.eventId);
    const early = project(
      fixture,
      s.events.filter((e) => e.eventId !== goal.eventId),
    );
    expect(toSnapshot(early).provisional).toBe(true);
    expect(early.voided.has(goal.eventId)).toBe(true);

    const complete = toSnapshot(applyEvent(early, goal));
    expect(complete.score).toEqual({ home: 0, away: 0 });
    expect(complete.provisional).toBe(false);
    expect(correction.sequence).toBe(complete.throughSequence);
  });

  it('ignores a duplicate correction', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home');
    const correction = s.voids(shot.eventId);
    const state = project(fixture, s.events);
    expect(applyEvent(state, correction)).toBe(state);
    expect(toSnapshot(state).home.shots).toBe(0);
  });
});
