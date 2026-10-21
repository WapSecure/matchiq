import type { OverlayCue } from '@matchiq/contracts';
import { OVERLAY_TIMING } from '../constants';
import { OverlayScheduler, type OverlayAction } from './overlay-scheduler';

const cue = (
  insight: string,
  priority: number,
  startMs: number,
  durationMs = 7_000,
): OverlayCue => ({
  schemaVersion: 1,
  overlayId: `ov_${insight}`,
  fixtureId: 'fx_test',
  insightId: `in_${insight}`,
  revision: 1,
  kind: 'KEY_MOMENT',
  priority,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: startMs,
  clockEndMs: startMs + durationMs,
  maxDisplayMs: OVERLAY_TIMING.maxDisplayMs,
  headline: `Cue ${insight}`,
  body: '',
  evidenceEventIds: ['ev_000001'],
  metricRefs: [],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'AUTO_APPROVED',
  synthetic: true,
});

const at = (clockMs: number, period = 1) => ({ period, clockMs });

const summary = (actions: readonly OverlayAction[]) =>
  actions.map((a) =>
    a.kind === 'publish'
      ? `publish ${a.cue.overlayId}@${a.cue.clockStartMs}-${a.cue.clockEndMs}`
      : `${a.kind} ${a.cue.overlayId}${a.kind === 'end' ? ` ${a.status}` : ''}`,
  );

describe('OverlayScheduler', () => {
  it('shows a cue at once when the slot is free and expires it on the match clock', () => {
    const s = new OverlayScheduler();
    expect(summary(s.offer(cue('a', 70, 1_000), at(1_000)))).toEqual([
      'publish ov_a@1000-8000',
    ]);
    expect(s.advance(at(7_999))).toEqual([]);
    expect(summary(s.advance(at(8_000)))).toEqual(['end ov_a EXPIRED']);
    expect(s.current).toBeNull();
  });

  it('lets a higher priority cue supersede only after the minimum dwell', () => {
    const s = new OverlayScheduler();
    s.offer(cue('low', 50, 0), at(0));
    const early = s.offer(cue('goal', 90, 1_000), at(1_000));
    expect(early).toEqual([]);
    expect(s.current?.overlayId).toBe('ov_low');
    const dwell = OVERLAY_TIMING.minDwellMs;
    expect(summary(s.advance(at(dwell)))).toEqual([
      'end ov_low RETRACTED',
      `publish ov_goal@${dwell}-${dwell + 7_000}`,
    ]);
  });

  it('supersedes immediately once the dwell is already met', () => {
    const s = new OverlayScheduler();
    s.offer(cue('low', 50, 0), at(0));
    expect(summary(s.offer(cue('goal', 90, 5_000), at(5_000)))).toEqual([
      'end ov_low RETRACTED',
      'publish ov_goal@5000-12000',
    ]);
  });

  it('queues equal or lower priority cues and shows them when the slot frees', () => {
    const s = new OverlayScheduler();
    s.offer(cue('a', 70, 0), at(0));
    expect(s.offer(cue('b', 70, 2_000), at(2_000))).toEqual([]);
    expect(summary(s.advance(at(7_000)))).toEqual([
      'end ov_a EXPIRED',
      'publish ov_b@7000-14000',
    ]);
  });

  it('drops queued cues that waited too long', () => {
    const s = new OverlayScheduler();
    s.offer(cue('long', 90, 0, 12_000), at(0));
    s.offer(cue('stale', 50, 1_000), at(1_000));
    const later = 1_000 + OVERLAY_TIMING.maxQueueWaitMs + 1;
    expect(summary(s.advance(at(later)))).toEqual([
      'end ov_long EXPIRED',
      'drop ov_stale',
    ]);
  });

  it('ignores a repeated insight and bounds the queue', () => {
    const s = new OverlayScheduler();
    s.offer(cue('a', 90, 0), at(0));
    expect(s.offer(cue('a', 90, 100), at(100))).toEqual([]);
    const drops = ['q1', 'q2', 'q3', 'q4', 'q5'].flatMap((id) =>
      s.offer(cue(id, 50, 200), at(200)),
    );
    expect(summary(drops)).toEqual(['drop ov_q5']);
  });

  it('flushes the live cue and the queue at a period boundary', () => {
    const s = new OverlayScheduler();
    s.offer(cue('a', 70, 0), at(0));
    s.offer(cue('b', 50, 100), at(100));
    expect(summary(s.flush('period ended'))).toEqual([
      'end ov_a EXPIRED',
      'drop ov_b',
    ]);
    expect(s.current).toBeNull();
  });

  it('expires a live cue when the period changes', () => {
    const s = new OverlayScheduler();
    s.offer(cue('a', 70, 2_900_000), at(2_900_000));
    expect(summary(s.advance(at(0, 2)))).toEqual(['end ov_a EXPIRED']);
  });

  it('revises live copy only when committed, keeping timing and bumping the revision', () => {
    const s = new OverlayScheduler();
    s.offer(cue('a', 70, 0), at(0));
    const copy = {
      headline: 'Agent headline',
      body: 'Agent body',
      evidenceEventIds: ['ev_000001'],
      metricRefs: [],
    };
    const revision = s.revise('in_a', copy);
    expect(revision.cue).toMatchObject({
      revision: 2,
      clockStartMs: 0,
      headline: 'Agent headline',
    });
    expect(s.current?.revision).toBe(1);
    revision.commit();
    expect(s.current?.revision).toBe(2);
    expect(s.revise('in_missing', copy).cue).toBeNull();
  });
});
