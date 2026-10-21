import { MetricRef } from '@matchiq/contracts';
import { project, rollingMetrics, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const SEC = 1_000;

/** Home: 2 shots, 5 final-third entries, 8 pressures, 3 high recoveries in (0, 5 min]. */
const busyHome = () => {
  const s = kickedOff();
  let t = 30 * SEC;
  const tick = () => {
    t += 10 * SEC;
    return s.at(1, t);
  };
  for (let i = 0; i < 2; i += 1) tick().shot('home');
  for (let i = 0; i < 5; i += 1) tick().entry('home');
  for (let i = 0; i < 8; i += 1) tick().pressure('home');
  for (let i = 0; i < 3; i += 1) tick().recovery('home', 70);
  s.at(1, 5 * MIN).possession('home');
  return s;
};

describe('momentum index', () => {
  it('matches the documented formula over a full window', () => {
    const snapshot = toSnapshot(project(fixture, busyHome().events));
    // home: .35*1.625 + .25*0.4 + .2*0 + .2*1.25 = 0.91875
    expect(snapshot.home.momentum).toEqual({
      status: 'available',
      value: 0.92,
      unit: 'index',
    });
    // away (no events): .35*-0.875 + .25*-1.6 + .2*-2 + .2*-1.25 = -1.35625
    expect(snapshot.away.momentum).toEqual({
      status: 'available',
      value: -1.36,
      unit: 'index',
    });
  });

  it('scales counts to a 5-minute rate when the period is younger than the window', () => {
    const s = kickedOff();
    s.at(1, 60 * SEC).shot('home');
    s.at(1, 90 * SEC).pressure('home');
    s.at(1, 150 * SEC).pressure('home');
    // covered 2.5 min => scale 2: .35*1.625 + .25*-1.6 + .2*-1 + .2*-1.25 = -0.28125
    expect(toSnapshot(project(fixture, s.events)).home.momentum).toMatchObject({
      value: -0.28,
    });
  });

  it('is INSUFFICIENT_SAMPLE before 2 minutes or with fewer than 3 events', () => {
    const early = kickedOff();
    early.at(1, 30 * SEC).shot('home');
    early.shot('home');
    early.at(1, 90 * SEC).shot('home');
    const sparse = kickedOff();
    sparse.at(1, 3 * MIN).shot('home');
    sparse.shot('away');
    for (const s of [early, sparse]) {
      const snapshot = toSnapshot(project(fixture, s.events));
      expect(snapshot.home.momentum).toEqual({
        status: 'unavailable',
        reason: 'INSUFFICIENT_SAMPLE',
      });
    }
  });

  it('only counts events inside the window of the current period', () => {
    const s = busyHome();
    s.at(1, 45 * MIN).periodEnded();
    s.at(2, 0).periodStarted();
    s.at(2, 3 * MIN).shot('away');
    const metrics = rollingMetrics(project(fixture, s.events));
    expect(metrics['shots.home.rolling5m']).toBe(0);
    expect(metrics['shots.away.rolling5m']).toBe(1);
  });
});

describe('rollingMetrics', () => {
  it('exposes contract-valid refs for current and previous windows', () => {
    const s = busyHome();
    s.at(1, 10 * MIN).shot('away');
    const metrics = rollingMetrics(project(fixture, s.events));
    expect(metrics).toMatchObject({
      'shots.home.rolling5m': 0,
      'shots.away.rolling5m': 1,
      'shots.home.previous5m': 2,
      'highRecoveries.home.previous5m': 3,
      'recoveries.home.previous5m': 3,
      'pressures.home.previous5m': 8,
      'finalThirdEntries.home.previous5m': 5,
      'momentum.home.previous5m': 0.92,
    });
    for (const ref of Object.keys(metrics)) {
      expect(MetricRef.safeParse(ref).success).toBe(true);
    }
  });

  it('is empty before any event', () => {
    expect(rollingMetrics(project(fixture, []))).toEqual({});
  });
});
