import { project, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const SEC = 1_000;
const snap = (events: Parameters<typeof project>[1]) =>
  toSnapshot(project(fixture, events));

describe('possessionPct (TIME_WEIGHTED)', () => {
  it('excludes contested time from the denominator and accrues the open segment', () => {
    const s = kickedOff();
    s.at(1, 0).possession('home');
    s.at(1, 10 * MIN).possession(null);
    s.at(1, 12 * MIN).possession('away');
    s.at(1, 20 * MIN).possession('home');
    s.at(1, 30 * MIN).shot('home');
    const snapshot = snap(s.events);
    expect(snapshot.home.possessionBasis).toBe('TIME_WEIGHTED');
    expect(snapshot.home.possessionPct).toEqual({
      status: 'available',
      value: 71.4,
      unit: 'percent',
      numerator: 20 * MIN,
      denominator: 28 * MIN,
    });
    expect(snapshot.away.possessionPct).toMatchObject({ value: 28.6 });
  });

  it('closes segments at period end and ignores dead time before the next change', () => {
    const s = kickedOff();
    s.at(1, 0).possession('home');
    s.at(1, 45 * MIN).periodEnded();
    s.at(2, 0).periodStarted();
    s.at(2, 5 * MIN).possession('away');
    s.at(2, 20 * MIN).shot('away');
    const snapshot = snap(s.events);
    expect(snapshot.home.possessionPct).toMatchObject({
      numerator: 45 * MIN,
      denominator: 60 * MIN,
      value: 75,
    });
    expect(snapshot.away.possessionPct).toMatchObject({ value: 25 });
  });

  it('reports an exact 50/50 split for tied possession', () => {
    const s = kickedOff();
    s.at(1, 0).possession('home');
    s.at(1, 5 * MIN).possession('away');
    s.at(1, 10 * MIN).possession(null);
    const snapshot = snap(s.events);
    expect(snapshot.home.possessionPct).toMatchObject({ value: 50 });
    expect(snapshot.away.possessionPct).toMatchObject({ value: 50 });
  });

  it('publishes shares that sum to exactly 100 when both halves tie at the last decimal', () => {
    const s = kickedOff();
    s.at(1, 0).possession('home');
    s.at(1, 49 * SEC).possession('away');
    s.at(1, 400 * SEC).possession(null);
    const { home, away } = snap(s.events);
    // Rounded on their own, 12.25 and 87.75 would show 12.3 and 87.8 (100.1).
    expect(home.possessionPct).toMatchObject({ value: 12.3 });
    expect(away.possessionPct).toMatchObject({ value: 87.7 });
  });

  it('keeps the pair at 100 for any split', () => {
    for (let homeSec = 1; homeSec < 400; homeSec += 1) {
      const s = kickedOff();
      s.at(1, 0).possession('home');
      s.at(1, homeSec * SEC).possession('away');
      s.at(1, 400 * SEC).possession(null);
      const { home, away } = snap(s.events);
      if (home.possessionPct.status !== 'available') throw new Error('n/a');
      if (away.possessionPct.status !== 'available') throw new Error('n/a');
      const tenths = (home.possessionPct.value + away.possessionPct.value) * 10;
      expect(Math.round(tenths)).toBe(1000);
    }
  });

  it('is unavailable when only contested time has elapsed', () => {
    const s = kickedOff();
    s.at(1, 0).possession(null);
    s.at(1, 3 * MIN).shot('home');
    expect(snap(s.events).home.possessionPct).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });
});

describe('possessionPct (EVENT_SHARE_PROXY)', () => {
  it('falls back to pass share, labelled, when no possession events exist', () => {
    const s = kickedOff();
    s.at(1, MIN).pass('home');
    s.pass('home');
    s.pass('home');
    s.pass('away');
    const snapshot = snap(s.events);
    expect(snapshot.home.possessionBasis).toBe('EVENT_SHARE_PROXY');
    expect(snapshot.away.possessionBasis).toBe('EVENT_SHARE_PROXY');
    expect(snapshot.home.possessionPct).toMatchObject({ value: 75 });
    expect(snapshot.away.possessionPct).toMatchObject({ value: 25 });
  });
});
