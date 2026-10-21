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

  it('resets derived state and requests a resync when the replay seeks back', () => {
    const store = createMatchStore(FX);
    store.getState().applyEvents(Array.from({ length: 30 }, (_, i) => shot(i)));
    store.getState().applyMessages([message('overlay.publish', cue(), 1)]);
    store
      .getState()
      .applyMessages([message('replay.status', replayStatus(2, 3_000), 2)]);
    const state = store.getState();
    expect(state.timeline).toHaveLength(0);
    expect(state.overlays).toEqual({});
    expect(state.resyncToken).toBe(1);
    expect(state.lastEventSequence).toBe(2);
  });

  it('tolerates a status frame trailing the delivered events', () => {
    const store = createMatchStore(FX);
    store.getState().applyEvents([shot(1), shot(2), shot(3)]);
    store
      .getState()
      .applyMessages([message('replay.status', replayStatus(1), 1)]);
    expect(store.getState().timeline).toHaveLength(3);
    expect(store.getState().resyncToken).toBe(0);
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
