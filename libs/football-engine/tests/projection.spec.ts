import { MatchSnapshot } from '@matchiq/contracts';
import {
  ALGORITHM_VERSION,
  applyEvent,
  createInitialState,
  project,
  toSnapshot,
} from '../src/index.js';
import { buildFixture, FIXTURE_ID, kickedOff, MIN } from './builders.js';

const fixture = buildFixture();

describe('createInitialState / toSnapshot', () => {
  it('produces a valid empty snapshot before any event', () => {
    const snapshot = MatchSnapshot.parse(
      toSnapshot(createInitialState(fixture)),
    );
    expect(snapshot).toMatchObject({
      fixtureId: FIXTURE_ID,
      throughSequence: -1,
      algorithmVersion: ALGORITHM_VERSION,
      phase: 'NOT_STARTED',
      period: null,
      matchClockMs: 0,
      score: { home: 0, away: 0 },
      provisional: false,
    });
    expect(snapshot.home.passCompletionPct).toEqual({
      status: 'unavailable',
      reason: 'ZERO_DENOMINATOR',
    });
    expect(snapshot.home.possessionBasis).toBe('EVENT_SHARE_PROXY');
    expect(snapshot.home.momentum).toEqual({
      status: 'unavailable',
      reason: 'INSUFFICIENT_SAMPLE',
    });
  });
});

describe('phase, period and clock', () => {
  it('follows the lifecycle events', () => {
    const s = kickedOff();
    const phases: string[] = [];
    const record = () =>
      phases.push(toSnapshot(project(fixture, s.events)).phase);
    record();
    s.at(1, 45 * MIN).periodEnded();
    record();
    s.at(2, 0).periodStarted();
    s.at(2, 10 * MIN).shot('home');
    record();
    s.at(2, 45 * MIN).periodEnded();
    s.matchEnded();
    record();
    expect(phases).toEqual(['IN_PLAY', 'BREAK', 'IN_PLAY', 'COMPLETED']);
    const snapshot = toSnapshot(project(fixture, s.events));
    expect(snapshot.period).toBe(2);
    expect(snapshot.matchClockMs).toBe(45 * MIN);
    expect(snapshot.throughSequence).toBe(s.events.length - 1);
  });

  it('never moves the displayed clock backwards within a period', () => {
    const s = kickedOff();
    s.at(1, 10 * MIN).shot('home');
    s.at(1, 9 * MIN).shot('away');
    expect(toSnapshot(project(fixture, s.events)).matchClockMs).toBe(10 * MIN);
  });
});

describe('idempotency and ordering', () => {
  it('ignores an event whose sequence or eventId was already applied', () => {
    const s = kickedOff();
    const shot = s.at(1, MIN).shot('home', 'ON_TARGET');
    const once = project(fixture, s.events);
    const twice = applyEvent(once, shot);
    expect(twice).toBe(once);
    const sameId = applyEvent(once, { ...shot, sequence: 99 });
    expect(sameId).toBe(once);
    expect(toSnapshot(twice).home.shots).toBe(1);
  });

  it('marks a sequence gap provisional and converges once the late event arrives', () => {
    const s = kickedOff();
    s.at(1, MIN).shot('home');
    s.at(1, 2 * MIN).shot('away');
    s.at(1, 3 * MIN).shot('home');
    const [a, b, late, c, d] = s.events;
    if (!a || !b || !late || !c || !d) throw new Error('script too short');

    const gapped = project(fixture, [a, b, c, d]);
    const gappedSnapshot = toSnapshot(gapped);
    expect(gappedSnapshot.provisional).toBe(true);
    expect(gappedSnapshot.throughSequence).toBe(d.sequence);
    expect(gappedSnapshot.home.shots).toBe(1);

    const filled = toSnapshot(applyEvent(gapped, late));
    const inOrder = toSnapshot(project(fixture, s.events));
    expect(filled.provisional).toBe(false);
    expect(filled).toEqual(inOrder);
  });

  it('rejects events from another fixture', () => {
    const s = kickedOff();
    const [first] = s.events;
    if (!first) throw new Error('missing event');
    expect(() =>
      applyEvent(createInitialState(fixture), {
        ...first,
        fixtureId: 'fx_other',
      }),
    ).toThrow(/fx_other/);
  });

  it('does not mutate the input state', () => {
    const s = kickedOff();
    const before = project(fixture, s.events);
    const snapshotBefore = toSnapshot(before);
    applyEvent(before, s.at(1, MIN).shot('home'));
    expect(toSnapshot(before)).toEqual(snapshotBefore);
  });
});

describe('stateHash', () => {
  it('is a sha256 hex digest that changes with observable state', () => {
    const s = kickedOff();
    const h1 = toSnapshot(project(fixture, s.events)).stateHash;
    s.at(1, MIN).pass('home');
    const h2 = toSnapshot(project(fixture, s.events)).stateHash;
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h2).not.toBe(h1);
    expect(toSnapshot(project(fixture, s.events)).stateHash).toBe(h2);
  });
});
