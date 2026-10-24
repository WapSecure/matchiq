import type { OverlayCue } from '@matchiq/contracts';
import type { EditorialView, OverlayEditorialState } from '@matchiq/db';
import { OVERLAY_TIMING } from '../constants';
import { sweepOutcome } from './approval-sweep';
import { applyEditorialPolicy } from './editorial-policy';
import { emptyBatch, streamDraft, type PipelineBatch } from './pipeline-batch';
import { OverlayScheduler, type OverlayAction } from './overlay-scheduler';

const KEY = { orgId: 'org_demo', fixtureId: 'fx_test' };
const NOW = '2026-10-24T10:00:00.000Z';
const WINDOW_MS = 45_000;

const cue: OverlayCue = {
  schemaVersion: 1,
  overlayId: 'ov_a',
  fixtureId: KEY.fixtureId,
  insightId: 'in_a',
  revision: 1,
  kind: 'KEY_MOMENT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 60_000,
  clockEndMs: 67_000,
  maxDisplayMs: OVERLAY_TIMING.maxDisplayMs,
  headline: 'Shot burst',
  body: '',
  evidenceEventIds: ['ev_000001'],
  metricRefs: [],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'AUTO_APPROVED',
  synthetic: true,
};

const batchOf = (actions: readonly OverlayAction[]): PipelineBatch => {
  const batch = emptyBatch();
  for (const action of actions) {
    if (action.kind === 'publish') {
      batch.drafts.push(
        streamDraft(KEY.fixtureId, NOW, 'overlay.publish', action.cue),
      );
      batch.overlays.push({
        cue: action.cue,
        status: 'LIVE',
        period: action.period,
        publishedSequence: 5,
      });
    } else if (action.kind === 'end') {
      batch.drafts.push(
        streamDraft(KEY.fixtureId, NOW, 'overlay.retract', {
          overlayId: action.cue.overlayId,
          revision: action.cue.revision,
          reason: action.reason,
        }),
      );
      batch.overlayEnds.push({
        overlayId: action.cue.overlayId,
        status: action.status,
        reason: action.reason,
      });
    }
  }
  return batch;
};

const view = (
  publishPolicy: 'AUTO' | 'MANUAL',
  state?: OverlayEditorialState,
): EditorialView => ({
  mode: 'AUTO',
  publishPolicy,
  overlays: new Map(state === undefined ? [] : [['ov_a', state]]),
  aired: new Set<string>(),
  suppressedInsights: new Set<string>(),
});

describe('the approval window is wall-clock time, not match-clock time', () => {
  const offered = () => {
    const scheduler = new OverlayScheduler();
    const published = scheduler.offer(cue, { period: 1, clockMs: 60_000 });
    const ended = scheduler.advance({ period: 1, clockMs: 90_000 });
    return { published, ended };
  };

  it('keeps a waiting cue approvable after the scheduler has closed its slot', () => {
    const { published, ended } = offered();
    expect(ended.map((a) => a.kind)).toEqual(['end']);

    const wall = 1_000_000;
    const waiting = applyEditorialPolicy(
      KEY,
      view('MANUAL'),
      batchOf(published),
      { nowMs: wall, windowMs: WINDOW_MS },
    );
    expect(waiting.batch.overlays[0]?.editorial).toEqual({
      state: 'AWAITING_APPROVAL',
      reason: 'AWAITING_APPROVAL',
      approvalDeadline: new Date(wall + WINDOW_MS),
    });

    const afterSlot = applyEditorialPolicy(
      KEY,
      view('MANUAL', 'AWAITING_APPROVAL'),
      batchOf(ended),
      { nowMs: wall + 30_000, windowMs: WINDOW_MS },
    );
    expect(afterSlot.batch.drafts).toEqual([]);
    expect(afterSlot.batch.overlayEnds).toEqual([]);
    expect(afterSlot.audits).toEqual([]);
  });

  it('lapses the cue only when the wall-clock sweep reports its window gone', () => {
    const lapsed = sweepOutcome(
      KEY,
      {
        lapsed: [{ overlayId: 'ov_a', insightId: 'in_a', revision: 1 }],
        due: [],
      },
      NOW,
    );
    expect(lapsed.drafts.map((d) => d.type)).toEqual(['overlay.review']);
    expect(lapsed.ends).toEqual([
      expect.objectContaining({
        overlayId: 'ov_a',
        status: 'EXPIRED',
        editorial: expect.objectContaining({ state: 'APPROVAL_EXPIRED' }),
      }),
    ]);
    expect(lapsed.audits.map((a) => a.action)).toEqual([
      'overlay.approval-expired',
    ]);
  });

  it('ends an approved cue on the match clock once its own slot is over', () => {
    const due = sweepOutcome(
      KEY,
      {
        lapsed: [],
        due: [{ overlayId: 'ov_a', insightId: 'in_a', revision: 1 }],
      },
      NOW,
    );
    expect(due.drafts.map((d) => d.type)).toEqual(['overlay.retract']);
    expect(due.ends).toEqual([
      { overlayId: 'ov_a', status: 'EXPIRED', reason: 'expired' },
    ]);
    expect(due.audits).toEqual([]);
  });
});

describe('AUTO publishing is unchanged by the approval window', () => {
  it('passes every scheduler decision through whatever the wall clock says', () => {
    const scheduler = new OverlayScheduler();
    const actions = [
      ...scheduler.offer(cue, { period: 1, clockMs: 60_000 }),
      ...scheduler.advance({ period: 1, clockMs: 90_000 }),
    ];
    const outcomes = [0, 45_000, 10_000_000].map((nowMs) => {
      const batch = batchOf(actions);
      const out = applyEditorialPolicy(KEY, view('AUTO'), batch, {
        nowMs,
        windowMs: WINDOW_MS,
      });
      expect(out.batch.drafts).toEqual(batch.drafts);
      expect(out.batch.overlays).toEqual(batch.overlays);
      expect(out.batch.overlayEnds).toEqual(batch.overlayEnds);
      expect(out.audits).toEqual([]);
      return out.batch;
    });
    expect(outcomes[0]).toEqual(outcomes[2]);
    expect(sweepOutcome(KEY, { lapsed: [], due: [] }, NOW)).toEqual({
      drafts: [],
      ends: [],
      audits: [],
    });
  });
});
