import { type MatchEvent, StreamMessage } from '@matchiq/contracts';
import {
  FX,
  cue,
  insight,
  message,
  narrative,
  shot,
  snapshot,
} from '@/test/factories';
import { createMatchStore } from './match-store';
import { selectActiveCues, selectNarrative } from './selectors';

const replayStatus = (appliedSequence: number, matchClockMs = 600_000) => ({
  fixtureId: FX,
  state: 'PLAYING' as const,
  speed: 20 as const,
  appliedSequence,
  period: 1,
  matchClockMs,
});

describe('match store', () => {
  it('uses factories that satisfy the stream contract', () => {
    expect(
      StreamMessage.safeParse(message('overlay.publish', cue(), 1)).success,
    ).toBe(true);
  });

  it('applies events idempotently and in sequence order', () => {
    const store = createMatchStore(FX);
    store.getState().applyEvents([shot(3), shot(1)]);
    store.getState().applyEvents([shot(1), shot(2), shot(3)]);
    expect(store.getState().timeline.map((e) => e.sequence)).toEqual([1, 2, 3]);
    expect(store.getState().lastEventSequence).toBe(3);
  });

  it('never moves the clock backwards for backfilled events', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages([message('replay.status', replayStatus(50, 900_000), 1)]);
    store.getState().applyEvents([shot(10, 300_000)]);
    expect(store.getState().clock.ms).toBe(900_000);
    store.getState().applyEvents([shot(60, 950_000)]);
    expect(store.getState().clock.ms).toBe(950_000);
  });

  it('applies a batch with a single notification', () => {
    const store = createMatchStore(FX);
    const listener = vi.fn();
    store.subscribe(listener);
    store
      .getState()
      .applyMessages([
        message('match.event', shot(1), 1),
        message('match.event', shot(2), 2),
        message('match.snapshot', snapshot({ throughSequence: 2 }), 3),
      ]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().timeline).toHaveLength(2);
  });

  it('never rolls a snapshot back to an older sequence', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applySnapshot(
        snapshot({ throughSequence: 20, score: { home: 2, away: 0 } }),
      );
    store.getState().applySnapshot(snapshot({ throughSequence: 10 }), true);
    expect(store.getState().snapshot?.score.home).toBe(2);
  });

  it('builds a momentum series from successive snapshots', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages(
        [1, 2, 3].map((i) =>
          message(
            'match.snapshot',
            snapshot({ throughSequence: i, matchClockMs: i * 60_000 }),
            i,
          ),
        ),
      );
    expect(store.getState().momentum.map((p) => p.clockMs)).toEqual([
      60_000, 120_000, 180_000,
    ]);
  });

  it('records unavailable momentum as null, never zero', () => {
    const store = createMatchStore(FX);
    const base = snapshot();
    store.getState().applySnapshot({
      ...base,
      home: {
        ...base.home,
        momentum: { status: 'unavailable', reason: 'INSUFFICIENT_SAMPLE' },
      },
    });
    expect(store.getState().momentum[0]?.home).toBeNull();
  });

  it('ignores stale overlay revisions and honours retraction tombstones', () => {
    const store = createMatchStore(FX);
    const s = store.getState();
    s.applyMessages([
      message('overlay.publish', cue({ revision: 2, headline: 'v2' }), 1),
    ]);
    s.applyMessages([
      message('overlay.publish', cue({ revision: 1, headline: 'v1' }), 2),
    ]);
    expect(store.getState().overlays['ov_1']?.cue?.headline).toBe('v2');
    s.applyMessages([
      message(
        'overlay.retract',
        { overlayId: 'ov_1', revision: 2, reason: 'Score corrected' },
        3,
      ),
    ]);
    expect(store.getState().overlays['ov_1']?.retracted?.reason).toBe(
      'Score corrected',
    );
    expect(store.getState().retractions[0]).toMatchObject({
      headline: 'v2',
      reason: 'Score corrected',
    });
    s.applyMessages([message('overlay.publish', cue({ revision: 2 }), 4)]);
    expect(store.getState().overlays['ov_1']?.retracted).not.toBeNull();
  });

  it('shows only on-air cues for the current clock, audience and locale', () => {
    const store = createMatchStore(FX);
    store.getState().applyMessages([
      message('replay.status', replayStatus(0, 600_000), 1),
      message('overlay.publish', cue(), 2),
      message(
        'overlay.publish',
        cue({ overlayId: 'ov_fr', locale: 'fr-FR' }),
        3,
      ),
      message(
        'overlay.publish',
        cue({
          overlayId: 'ov_late',
          clockStartMs: 700_000,
          clockEndMs: 705_000,
        }),
        4,
      ),
    ]);
    const state = store.getState();
    expect(
      selectActiveCues(state, 'BROADCAST', 'en-GB').map((c) => c.overlayId),
    ).toEqual(['ov_1']);
    expect(
      selectActiveCues(state, 'CASUAL', 'en-GB').map((c) => c.overlayId),
    ).toEqual(['ov_1']);
    expect(
      selectActiveCues(state, 'BROADCAST', 'fr-FR').map((c) => c.overlayId),
    ).toEqual(['ov_fr']);
  });

  it('indexes narratives by persona and locale with an en-GB fallback', () => {
    const store = createMatchStore(FX);
    store.getState().applyMessages([
      message('insight.detected', insight(), 1),
      message('narrative.ready', narrative(), 2),
      message(
        'narrative.ready',
        narrative({
          narrativeId: 'nr_fr',
          locale: 'fr-FR',
          headline: 'Pression',
        }),
        3,
      ),
    ]);
    const state = store.getState();
    expect(
      selectNarrative(state, 'in_1', 'BROADCAST', 'fr-FR')?.narrative.headline,
    ).toBe('Pression');
    expect(selectNarrative(state, 'in_1', 'BROADCAST', 'es-ES')).toMatchObject({
      localeFallback: true,
    });
    expect(selectNarrative(state, 'in_1', 'CASUAL', 'en-GB')).toBeNull();
  });

  it('upserts insights by id, newest match clock first', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages([
        message(
          'insight.detected',
          insight({ insightId: 'in_a', matchClockMs: 100 }),
          1,
        ),
        message(
          'insight.detected',
          insight({ insightId: 'in_b', matchClockMs: 200 }),
          2,
        ),
        message(
          'insight.detected',
          insight({ insightId: 'in_a', matchClockMs: 100, status: 'FALLBACK' }),
          3,
        ),
      ]);
    expect(
      store.getState().insights.map((i) => [i.insightId, i.status]),
    ).toEqual([
      ['in_b', 'PUBLISHED'],
      ['in_a', 'FALLBACK'],
    ]);
  });

  it('orders insights by period before the period-relative clock', () => {
    const store = createMatchStore(FX);
    store.getState().applyHydration({
      insights: [
        insight({
          insightId: 'in_h1_late',
          period: 1,
          matchClockMs: 41 * 60_000,
        }),
        insight({
          insightId: 'in_h2_early',
          period: 2,
          matchClockMs: 19 * 60_000,
        }),
        insight({
          insightId: 'in_h1_early',
          period: 1,
          matchClockMs: 22 * 60_000,
        }),
      ],
    });
    expect(store.getState().insights.map((i) => i.insightId)).toEqual([
      'in_h2_early',
      'in_h1_late',
      'in_h1_early',
    ]);
  });

  it('never rewinds derived state for a status behind the applied events', () => {
    const store = createMatchStore(FX);
    store.getState().applyEvents(Array.from({ length: 30 }, (_, i) => shot(i)));
    store.getState().applyMessages([message('overlay.publish', cue(), 1)]);
    store
      .getState()
      .applyMessages([message('replay.status', replayStatus(2, 3_000), 2)]);
    const state = store.getState();
    expect(state.timeline).toHaveLength(30);
    expect(state.overlays['ov_1']).toBeDefined();
    expect(state.replay?.appliedSequence).toBe(2);
    expect(state.clock.ms).toBe(29_000);
  });

  it('applies stream statuses in order but ignores an older REST read', () => {
    const store = createMatchStore(FX);
    const s = store.getState();
    s.applyMessages([message('replay.status', replayStatus(40), 1)]);
    s.applyReplayStatus({ ...replayStatus(20), state: 'PAUSED' }, 'rest');
    expect(store.getState().replay).toMatchObject({
      appliedSequence: 40,
      state: 'PLAYING',
    });
    s.applyReplayStatus({ ...replayStatus(45), state: 'PAUSED' }, 'rest');
    expect(store.getState().replay?.state).toBe('PAUSED');
    s.applyMessages([
      message('replay.status', { ...replayStatus(45), state: 'COMPLETED' }, 2),
    ]);
    expect(store.getState().replay?.state).toBe('COMPLETED');
  });

  it('merges hydration with stream state without duplicates', () => {
    const store = createMatchStore(FX);
    const s = store.getState();
    s.applyMessages([
      message('insight.detected', insight({ status: 'PUBLISHED' }), 1),
      message('overlay.publish', cue({ revision: 2, headline: 'agent' }), 2),
      message('narrative.ready', narrative(), 3),
    ]);
    s.applyHydration({
      insights: [
        insight({ status: 'DETECTED' }),
        insight({ insightId: 'in_old', matchClockMs: 100 }),
      ],
      overlays: [
        cue({ revision: 1, headline: 'template' }),
        cue({ overlayId: 'ov_old', status: 'EXPIRED' }),
      ],
      narratives: [
        narrative(),
        narrative({ narrativeId: 'nr_fr', locale: 'fr-FR' }),
      ],
    });
    const state = store.getState();
    expect(state.insights.map((i) => [i.insightId, i.status])).toEqual([
      ['in_1', 'PUBLISHED'],
      ['in_old', 'PUBLISHED'],
    ]);
    expect(state.overlays['ov_1']?.cue?.headline).toBe('agent');
    expect(state.overlays['ov_old']?.retracted).not.toBeNull();
    expect(Object.keys(state.narratives['in_1'] ?? {})).toEqual([
      'BROADCAST:en-GB',
      'BROADCAST:fr-FR',
    ]);
  });

  it('takes a terminal status from the read model over the detection status', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages([
        message('insight.detected', insight({ status: 'DETECTED' }), 1),
      ]);
    store
      .getState()
      .applyHydration({ insights: [insight({ status: 'FALLBACK' })] });
    expect(store.getState().insights.map((i) => i.status)).toEqual([
      'FALLBACK',
    ]);
  });

  it('logs expiries separately from real retractions', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages([
        message('overlay.publish', cue(), 1),
        message(
          'overlay.retract',
          { overlayId: 'ov_1', revision: 1, reason: 'expired' },
          2,
        ),
        message('overlay.publish', cue({ overlayId: 'ov_2' }), 3),
        message(
          'overlay.retract',
          { overlayId: 'ov_2', revision: 1, reason: 'Goal disallowed' },
          4,
        ),
      ]);
    expect(store.getState().retractions.map((r) => r.ending)).toEqual([
      'RETRACTED',
      'EXPIRED',
    ]);
  });

  it('falls back to en-GB broadcast cues for other personas and locales', () => {
    const store = createMatchStore(FX);
    store
      .getState()
      .applyMessages([
        message('replay.status', replayStatus(0, 600_000), 1),
        message('overlay.publish', cue(), 2),
      ]);
    expect(
      selectActiveCues(store.getState(), 'CASUAL', 'fr-FR').map(
        (c) => c.overlayId,
      ),
    ).toEqual(['ov_1']);
  });

  it('marks voided events from corrections', () => {
    const store = createMatchStore(FX);
    const { schemaVersion, fixtureId, period, wallClockUtc, provenance } =
      shot(2);
    const correction: MatchEvent = {
      schemaVersion,
      fixtureId,
      period,
      wallClockUtc,
      provenance,
      eventId: 'ev_c',
      sequence: 2,
      matchClockMs: 2_000,
      type: 'CORRECTION',
      correctedEventId: 'ev_1',
      action: 'VOID',
      reason: 'Offside',
    };
    store.getState().applyEvents([shot(1), correction]);
    expect(store.getState().voided).toEqual({ ev_1: 'Offside' });
  });
});
