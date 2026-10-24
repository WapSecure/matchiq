import { Insight, MatchSnapshot } from '@matchiq/contracts';
import { detectKeyMoments, project, toSnapshot } from '../src/index.js';
import { buildFixture, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();
const snapshotOf = (s: ReturnType<typeof kickedOff>) =>
  MatchSnapshot.parse(toSnapshot(project(fixture, s.events)));
const milestones = (s: ReturnType<typeof kickedOff>) =>
  detectKeyMoments(project(fixture, s.events)).filter(
    (i) => i.kind === 'PLAYER_MILESTONE',
  );

describe('shot conversion', () => {
  it('is unavailable, never 0, when the team has no shots', () => {
    expect(snapshotOf(kickedOff()).home.shotConversionPct).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });

  it('is goals over shots with numerator and denominator', () => {
    const s = kickedOff();
    const scoring = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.goal('home', scoring.eventId);
    s.at(1, 2 * MIN).shot('home');
    s.at(1, 3 * MIN).shot('home');
    s.at(1, 4 * MIN).shot('home', 'BLOCKED');
    expect(snapshotOf(s).home.shotConversionPct).toEqual({
      status: 'available',
      value: 25,
      unit: 'percent',
      numerator: 1,
      denominator: 4,
    });
  });

  it('excludes own goals credited to the team', () => {
    const s = kickedOff();
    const awayShot = s.at(1, MIN).shot('away', 'ON_TARGET');
    s.goal('away', awayShot.eventId, true);
    const home = snapshotOf(s).home;
    expect(home.goals).toBe(1);
    expect(home.shotConversionPct).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
  });
});

describe('pass quality', () => {
  it('is the share of completed passes that gain 10 pitch units', () => {
    const s = kickedOff();
    const forward = s.at(1, MIN).pass('home', 65);
    s.completed('home', forward.eventId);
    const sideways = s.at(1, 2 * MIN).pass('home', 55);
    s.completed('home', sideways.eventId);
    s.at(1, 3 * MIN).pass('home', 80);
    expect(snapshotOf(s).home.passQualityPct).toEqual({
      status: 'available',
      value: 50,
      unit: 'percent',
      numerator: 1,
      denominator: 2,
    });
  });

  it('is unavailable until a pass is completed and counts a completion once', () => {
    const s = kickedOff();
    expect(snapshotOf(s).home.passQualityPct).toMatchObject({
      status: 'unavailable',
    });
    const forward = s.at(1, MIN).pass('home', 90);
    s.completed('home', forward.eventId);
    s.completed('home', forward.eventId);
    expect(snapshotOf(s).home.passQualityPct).toMatchObject({
      value: 100,
      numerator: 1,
      denominator: 1,
    });
  });
});

describe('player milestones', () => {
  const script = () => {
    const s = kickedOff();
    const first = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.goal('home', first.eventId);
    s.at(1, 2 * MIN).shot('home', 'ON_TARGET');
    s.at(1, 3 * MIN).card('home', 'YELLOW');
    s.at(1, 4 * MIN).card('home', 'YELLOW');
    return { s, first };
  };

  it('emits each first once, as P2 with the exact event ids', () => {
    const { s, first } = script();
    const found = milestones(s);
    expect(found.map((i) => [i.priority, i.reasonCode])).toEqual([
      ['P2', 'FIRST_SHOT_ON_TARGET'],
      ['P2', 'FIRST_GOAL'],
      ['P2', 'FIRST_YELLOW_CARD'],
    ]);
    expect(found[0]?.evidence.eventIds).toEqual([first.eventId]);
    expect(found.every((i) => Insight.safeParse(i).success)).toBe(true);
    expect(found[1]?.evidence).toMatchObject({
      sampleSize: 1,
      confidenceType: 'measured',
      confidenceLabel: 'high',
    });
    expect(found[1]?.evidence.limitations).toEqual(expect.any(String));
  });

  it('keeps stable insight ids across re-scans', () => {
    const ids = (s: ReturnType<typeof kickedOff>) =>
      milestones(s).map((i) => i.insightId);
    expect(ids(script().s)).toEqual(ids(script().s));
  });

  it('ignores own goals and voided events', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home');
    s.goal('home', shot.eventId, true);
    const card = s.at(1, 2 * MIN).card('away', 'YELLOW');
    s.at(1, 3 * MIN).voids(card.eventId);
    expect(milestones(s)).toEqual([]);
  });
});
