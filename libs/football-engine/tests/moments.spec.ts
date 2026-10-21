import { Insight } from '@matchiq/contracts';
import {
  createMomentCursor,
  detectKeyMoments,
  getMetricDefinition,
  project,
  stepMoments,
  type ProjectionState,
} from '../src/index.js';
import { buildFixture, kickedOff, MIN, player, TEAM } from './builders.js';

const fixture = buildFixture();
const SEC = 1_000;

const moments = (events: Parameters<typeof project>[1]) => {
  const insights = detectKeyMoments(project(fixture, events));
  for (const insight of insights) Insight.parse(insight);
  return insights;
};
const ofKind = (insights: Insight[], kind: Insight['kind']) =>
  insights.filter((i) => i.kind === kind);

describe('GOAL and RED_CARD (P0)', () => {
  it('emits a P0 goal citing the goal and its shot', () => {
    const s = kickedOff();
    s.at(1, 2 * MIN).shot('away');
    const shot = s.at(1, 3 * MIN).shot('home', 'ON_TARGET');
    const goal = s.goal('home', shot.eventId);
    const [insight] = ofKind(moments(s.events), 'GOAL');
    expect(insight).toMatchObject({
      priority: 'P0',
      teamId: TEAM.home,
      playerId: player('home'),
      reasonCode: 'GOAL_SCORED',
      matchClockMs: 3 * MIN,
      status: 'DETECTED',
    });
    expect(insight?.evidence).toMatchObject({
      eventIds: [goal.eventId, shot.eventId],
      windowStartMs: 0,
      windowEndMs: 3 * MIN,
      confidenceLabel: 'high',
      generatedAt: goal.wallClockUtc,
    });
    expect(insight?.evidence.computedMetrics).toMatchObject({
      'goals.home': 1,
      'goals.away': 0,
      'shots.home.rolling5m': 1,
    });
    expect(insight?.evidence.rationale).toContain('1-0');
    expect(insight?.evidence.counterEvidence).toEqual([
      expect.objectContaining({ eventIds: [s.events[2]?.eventId] }),
    ]);
  });

  it('credits an own goal to the opponent without naming a scorer', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    s.goal('away', shot.eventId, true);
    const [insight] = ofKind(moments(s.events), 'GOAL');
    expect(insight?.teamId).toBe(TEAM.home);
    expect(insight?.playerId).toBeUndefined();
    expect(insight?.reasonCode).toBe('OWN_GOAL_SCORED');
  });

  it('emits P0 for a straight red and a second yellow, not for a first yellow', () => {
    const s = kickedOff();
    s.at(1, MIN).card('home', 'YELLOW');
    s.card('home', 'SECOND_YELLOW');
    s.card('away', 'RED');
    const reds = ofKind(moments(s.events), 'RED_CARD');
    expect(reds.map((i) => [i.teamId, i.reasonCode, i.priority])).toEqual([
      [TEAM.home, 'SECOND_YELLOW_DISMISSAL', 'P0'],
      [TEAM.away, 'RED_CARD_SHOWN', 'P0'],
    ]);
    expect(reds[0]?.evidence.computedMetrics['redCards.home']).toBe(1);
  });

  it('drops the insight of a voided goal on re-detection', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    const goal = s.goal('home', shot.eventId);
    s.voids(goal.eventId);
    expect(ofKind(moments(s.events), 'GOAL')).toEqual([]);
  });
});

describe('SHOT_BURST and HIGH_REGAINS (P1)', () => {
  it('fires once at the third shot within 5 minutes and debounces the rest', () => {
    const s = kickedOff();
    const shots = [1, 2, 3, 4, 5].map((m) => s.at(1, m * MIN).shot('home'));
    s.at(1, 3 * MIN + SEC).shot('away');
    const bursts = ofKind(moments(s.events), 'SHOT_BURST');
    expect(bursts).toHaveLength(1);
    expect(bursts[0]).toMatchObject({ priority: 'P1', matchClockMs: 3 * MIN });
    expect(bursts[0]?.evidence.eventIds).toEqual(
      shots.slice(0, 3).map((e) => e.eventId),
    );
    expect(bursts[0]?.evidence.computedMetrics['shots.home.rolling5m']).toBe(3);
  });

  it('fires again after the debounce window when a new burst forms', () => {
    const s = kickedOff();
    for (const m of [1, 2, 3, 9, 10, 11]) s.at(1, m * MIN).shot('home');
    expect(
      ofKind(moments(s.events), 'SHOT_BURST').map((i) => i.matchClockMs),
    ).toEqual([3 * MIN, 11 * MIN]);
  });

  it('does not fire for shots spread beyond the window', () => {
    const s = kickedOff();
    for (const m of [1, 4, 7, 10]) s.at(1, m * MIN).shot('home');
    expect(ofKind(moments(s.events), 'SHOT_BURST')).toEqual([]);
  });

  it('counts only high recoveries and lists opponent regains as counter-evidence', () => {
    const s = kickedOff();
    s.at(1, MIN).recovery('home', 30);
    s.at(1, 2 * MIN).recovery('away', 80);
    for (const m of [3, 4, 5]) s.at(1, m * MIN).recovery('home', 65);
    const [regains] = ofKind(moments(s.events), 'HIGH_REGAINS');
    expect(regains?.matchClockMs).toBe(5 * MIN);
    expect(
      regains?.evidence.computedMetrics['highRecoveries.home.rolling5m'],
    ).toBe(3);
    expect(regains?.evidence.counterEvidence[0]?.eventIds).toEqual([
      s.events[3]?.eventId,
    ]);
  });
});

const pressureSpell = () => {
  const s = kickedOff();
  for (let i = 1; i <= 5; i += 1) s.at(1, i * MIN).pressure('home');
  for (let i = 1; i <= 10; i += 1)
    s.at(1, 10 * MIN + i * 25 * SEC).pressure('home');
  return s;
};

describe('PRESSURE_SWING and MOMENTUM_SHIFT (P1)', () => {
  it('fires a pressure swing when pressures rise against the previous window', () => {
    const swings = ofKind(moments(pressureSpell().events), 'PRESSURE_SWING');
    expect(swings).toHaveLength(1);
    const [swing] = swings;
    expect(swing?.teamId).toBe(TEAM.home);
    // fires at the 8th pressure of the spell (13:20); evidence spans both windows
    expect(swing?.matchClockMs).toBe(13 * MIN + 20 * SEC);
    const metrics = swing?.evidence.computedMetrics ?? {};
    expect(metrics['pressures.home.rolling5m']).toBeGreaterThanOrEqual(8);
    expect(
      (metrics['pressures.home.rolling5m'] ?? 0) -
        (metrics['pressures.home.previous5m'] ?? 0),
    ).toBeGreaterThanOrEqual(5);
    expect(metrics['pressures.home.rolling5m']).toBe(8);
    expect(metrics['pressures.home.previous5m']).toBe(2);
    expect(swing?.evidence.windowStartMs).toBe(3 * MIN + 20 * SEC);
    expect(swing?.evidence.windowEndMs).toBe(13 * MIN + 20 * SEC);
  });

  it('fires a momentum shift when the differential rises sharply', () => {
    const s = kickedOff();
    let t = 3 * MIN;
    const away = () => s.at(1, (t += 11 * SEC));
    away().shot('away');
    for (let i = 0; i < 5; i += 1) away().entry('away');
    for (let i = 0; i < 8; i += 1) away().pressure('away');
    for (let i = 0; i < 2; i += 1) away().recovery('away', 70);
    t = 10 * MIN;
    const home = () => s.at(1, (t += 20 * SEC));
    for (let i = 0; i < 3; i += 1) home().shot('home');
    for (let i = 0; i < 6; i += 1) home().entry('home');
    for (let i = 0; i < 3; i += 1) home().recovery('home', 70);
    const shifts = ofKind(moments(s.events), 'MOMENTUM_SHIFT');
    expect(shifts).toHaveLength(1);
    expect(shifts[0]?.teamId).toBe(TEAM.home);
    expect(shifts[0]?.matchClockMs).toBeGreaterThan(10 * MIN);
    const metrics = shifts[0]?.evidence.computedMetrics ?? {};
    expect(metrics['momentum.home.rolling5m']).toBeDefined();
    expect(shifts[0]?.evidence.rationale).toContain('not a prediction');
  });
});

describe('determinism and evidence integrity', () => {
  const busy = () => {
    const s = pressureSpell();
    const shot = s.at(1, 11 * MIN).shot('home', 'ON_TARGET');
    s.goal('home', shot.eventId);
    s.shot('home');
    s.shot('home');
    return s;
  };

  it('is stable across runs and matches incremental stepping', () => {
    const state: ProjectionState = project(fixture, busy().events);
    const batch = detectKeyMoments(state);
    expect(detectKeyMoments(state)).toEqual(batch);
    let cursor = createMomentCursor();
    const stepped = state.ledger.flatMap((event) => {
      const step = stepMoments(cursor, event, state.fixture);
      cursor = step.cursor;
      return step.insights;
    });
    expect(stepped).toEqual(batch);
    expect(new Set(batch.map((i) => i.insightId)).size).toBe(batch.length);
  });

  it('only cites registered metrics and ids that exist in the ledger', () => {
    const state = project(fixture, busy().events);
    const known = new Set(state.ledger.map((e) => e.eventId));
    for (const insight of detectKeyMoments(state)) {
      expect(insight.evidence.insightId).toBe(insight.insightId);
      for (const ref of Object.keys(insight.evidence.computedMetrics)) {
        expect(getMetricDefinition(ref)).toBeDefined();
      }
      const ids = [
        ...insight.evidence.eventIds,
        ...insight.evidence.counterEvidence.flatMap((c) => c.eventIds),
      ];
      for (const id of ids) expect(known.has(id)).toBe(true);
    }
  });
});
