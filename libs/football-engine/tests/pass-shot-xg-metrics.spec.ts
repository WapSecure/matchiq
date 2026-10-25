import { MatchSnapshot } from '@matchiq/contracts';
import { project, toSnapshot } from '../src/index.js';
import { getMetricDefinition } from '../src/index.js';
import { xgBaseline } from '../src/lib/metrics/geometry.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const snapshotOf = (s: ReturnType<typeof kickedOff>) =>
  MatchSnapshot.parse(toSnapshot(project(fixture, s.events)));

describe('pass distance', () => {
  it('is unavailable with no completed passes', () => {
    const s = kickedOff();
    s.at(1, MIN).pass('home', 70);
    expect(snapshotOf(s).home.passDistanceAvgM).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });

  it('averages metres over completed passes on the fixture pitch', () => {
    const s = kickedOff();
    const a = s.at(1, MIN).pass('home', 60);
    s.completed('home', a.eventId);
    const b = s.at(1, 2 * MIN).pass('home', 80);
    s.completed('home', b.eventId);
    // 10 and 30 pitch units of a 105 m pitch: 10.5 m and 31.5 m
    expect(snapshotOf(s).home.passDistanceAvgM).toEqual({
      status: 'available',
      value: 21,
      unit: 'metres',
      denominator: 2,
    });
  });
});

describe('synthetic pass difficulty', () => {
  it('scores a pressured forward pass above a short square-free one', () => {
    const easy = kickedOff();
    const e = easy.at(1, MIN).pass('home', 52);
    easy.completed('home', e.eventId);
    const hard = kickedOff();
    const h = hard.at(1, MIN).pass('home', 80, { underPressure: true });
    hard.completed('home', h.eventId);
    const value = (s: ReturnType<typeof kickedOff>) => {
      const m = snapshotOf(s).home.passDifficultyAvg;
      return m?.status === 'available' ? m.value : -1;
    };
    expect(value(easy)).toBeGreaterThanOrEqual(0);
    expect(value(hard)).toBeGreaterThan(value(easy));
    expect(value(hard)).toBeLessThanOrEqual(100);
  });

  it('is labelled synthetic in its definition', () => {
    const def = getMetricDefinition('passDifficultyAvg.home');
    expect(def?.label).toMatch(/synthetic/i);
    expect(def?.description).toMatch(/never calibrated/i);
  });
});

describe('shot speed', () => {
  it('is unavailable (NOT_GENERATED) without speedKph', () => {
    const s = kickedOff();
    s.at(1, MIN).shot('home');
    const home = snapshotOf(s).home;
    expect(home.shotSpeedAvgKph).toEqual({
      status: 'unavailable',
      reason: 'NOT_GENERATED',
    });
    expect(home.shotSpeedMaxKph?.status).toBe('unavailable');
  });

  it('averages and maxes only shots that carry a speed', () => {
    const s = kickedOff();
    s.at(1, MIN).shot('home', 'ON_TARGET', { speedKph: 90 });
    s.at(1, 2 * MIN).shot('home', 'OFF_TARGET', { speedKph: 110 });
    s.at(1, 3 * MIN).shot('home');
    const home = snapshotOf(s).home;
    expect(home.shotSpeedAvgKph).toMatchObject({ value: 100, unit: 'kph' });
    expect(home.shotSpeedMaxKph).toMatchObject({ value: 110, unit: 'kph' });
  });
});

describe('xG baseline (synthetic, not calibrated)', () => {
  it('is unavailable with no shots', () => {
    expect(snapshotOf(kickedOff()).home.xgBaseline).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });

  it('rises as shots get closer and more central', () => {
    const pitch = { lengthM: 105, widthM: 68 };
    const close = xgBaseline({ x: 94, y: 50 }, pitch);
    const far = xgBaseline({ x: 70, y: 50 }, pitch);
    const wide = xgBaseline({ x: 94, y: 5 }, pitch);
    expect(close).toBeGreaterThan(far);
    expect(close).toBeGreaterThan(wide);
    expect(close).toBeLessThan(1);
    expect(far).toBeGreaterThan(0);
  });

  it('sums over shots and carries the label in its definition', () => {
    const s = kickedOff();
    s.at(1, MIN).shot('home');
    s.at(1, 2 * MIN).shot('home');
    const value = snapshotOf(s).home.xgBaseline;
    expect(value).toMatchObject({ status: 'available', unit: 'xg' });
    expect(getMetricDefinition('xgBaseline.home')?.label).toContain(
      'synthetic, not calibrated',
    );
  });
});
