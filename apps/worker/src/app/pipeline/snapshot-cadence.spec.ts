import type { MatchEvent } from '@matchiq/contracts';
import { buildTestEvent } from '@matchiq/db/testing';
import { SNAPSHOT_CADENCE } from '../constants';
import { SnapshotCadence } from './snapshot-cadence';

const shot = (sequence: number, clockMs: number, period = 1): MatchEvent => ({
  ...buildTestEvent('fx_cadence', sequence, { matchClockMs: clockMs }),
  period,
});

const goal = (sequence: number, clockMs: number): MatchEvent => ({
  schemaVersion: 1,
  eventId: `ev_g${sequence}`,
  fixtureId: 'fx_cadence',
  sequence,
  period: 1,
  matchClockMs: clockMs,
  wallClockUtc: '2026-10-20T19:31:00Z',
  provenance: {
    kind: 'synthetic',
    generatorVersion: '0.1.0',
    seed: 1,
    scenario: 't',
  },
  type: 'GOAL',
  teamId: 'tm_harbour',
  playerId: 'pl_harbour_9',
  shotEventId: 'ev_00001',
  ownGoal: false,
});

describe('SnapshotCadence', () => {
  it('snapshots the first event, then every maxEvents events', () => {
    const cadence = new SnapshotCadence();
    const due = Array.from({ length: 60 }, (_, i) =>
      cadence.shouldSnapshot(shot(i, i * 100)),
    );
    const at = due.flatMap((d, i) => (d ? [i] : []));
    const n = SNAPSHOT_CADENCE.maxEvents;
    expect(at).toEqual(
      Array.from({ length: Math.ceil(60 / n) }, (_, i) => i * n),
    );
  });

  it('snapshots after maxClockMs of match clock even with few events', () => {
    const cadence = new SnapshotCadence();
    cadence.shouldSnapshot(shot(0, 0));
    expect(
      cadence.shouldSnapshot(shot(1, SNAPSHOT_CADENCE.maxClockMs - 1)),
    ).toBe(false);
    expect(cadence.shouldSnapshot(shot(2, SNAPSHOT_CADENCE.maxClockMs))).toBe(
      true,
    );
  });

  it('always snapshots state-changing events and period changes', () => {
    const cadence = new SnapshotCadence();
    cadence.shouldSnapshot(shot(0, 0));
    expect(cadence.shouldSnapshot(goal(1, 10))).toBe(true);
    expect(cadence.shouldSnapshot(shot(2, 20))).toBe(false);
    expect(cadence.shouldSnapshot(shot(3, 0, 2))).toBe(true);
  });

  it('depends only on the event stream, so two runs agree', () => {
    const run = () => {
      const cadence = new SnapshotCadence();
      return Array.from({ length: 200 }, (_, i) =>
        cadence.shouldSnapshot(shot(i, i * 1_700)),
      );
    };
    expect(run()).toEqual(run());
  });
});
