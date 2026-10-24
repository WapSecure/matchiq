import type { OverlayCue } from '@matchiq/contracts';
import type { EditorialView, OverlayEditorialState } from '@matchiq/db';
import { OVERLAY_END_REASONS, OVERLAY_TIMING } from '../constants';
import { applyEditorialPolicy } from './editorial-policy';
import { emptyBatch, streamDraft, type PipelineBatch } from './pipeline-batch';

const KEY = { orgId: 'org_demo', fixtureId: 'fx_test' };
const now = '2026-10-22T10:00:00.000Z';

const cue = (revision = 1): OverlayCue => ({
  schemaVersion: 1,
  overlayId: 'ov_a',
  fixtureId: KEY.fixtureId,
  insightId: 'in_a',
  revision,
  kind: 'KEY_MOMENT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 1_000,
  clockEndMs: 8_000,
  maxDisplayMs: OVERLAY_TIMING.maxDisplayMs,
  headline: `Cue revision ${revision}`,
  body: '',
  evidenceEventIds: ['ev_000001'],
  metricRefs: [],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'AUTO_APPROVED',
  synthetic: true,
});

const publish = (batch: PipelineBatch, c: OverlayCue) => {
  batch.drafts.push(streamDraft(KEY.fixtureId, now, 'overlay.publish', c));
  batch.overlays.push({
    cue: c,
    status: 'LIVE',
    period: 1,
    publishedSequence: 5,
  });
};

const end = (batch: PipelineBatch, reason: string, revision = 1) => {
  batch.drafts.push(
    streamDraft(KEY.fixtureId, now, 'overlay.retract', {
      overlayId: 'ov_a',
      revision,
      reason,
    }),
  );
  batch.overlayEnds.push({ overlayId: 'ov_a', status: 'EXPIRED', reason });
};

const manual = (
  state?: OverlayEditorialState,
  partial: Partial<EditorialView> = {},
): EditorialView => ({
  mode: 'AUTO',
  publishPolicy: 'MANUAL',
  overlays: new Map(state === undefined ? [] : [['ov_a', state]]),
  aired: new Set<string>(),
  suppressedInsights: new Set<string>(),
  ...partial,
});

const reviewOf = (batch: PipelineBatch) =>
  batch.drafts.filter((d) => d.type === 'overlay.review').map((d) => d.payload);

describe('applyEditorialPolicy in MANUAL (ADR-0023)', () => {
  it('holds a gated cue as AWAITING_APPROVAL and announces it without copy', () => {
    const batch = emptyBatch();
    publish(batch, cue());
    const out = applyEditorialPolicy(KEY, manual(), batch);
    expect(out.batch.drafts.map((d) => d.type)).toEqual(['overlay.review']);
    expect(reviewOf(out.batch)).toEqual([
      {
        overlayId: 'ov_a',
        insightId: 'in_a',
        revision: 1,
        state: 'AWAITING_APPROVAL',
      },
    ]);
    expect(out.batch.overlays).toEqual([
      expect.objectContaining({
        status: 'VERIFIED',
        cue: expect.objectContaining({ status: 'VERIFIED', clockEndMs: 8_000 }),
        editorial: {
          state: 'AWAITING_APPROVAL',
          reason: 'AWAITING_APPROVAL',
          approvalDeadline: expect.any(Date),
        },
      }),
    ]);
    expect(out.audits.map((a) => a.action)).toEqual([
      'overlay.awaiting-approval',
    ]);
  });

  it('keeps a waiting cue waiting with the newer copy when a revision lands', () => {
    const batch = emptyBatch();
    publish(batch, cue(2));
    const out = applyEditorialPolicy(KEY, manual('AWAITING_APPROVAL'), batch);
    expect(reviewOf(out.batch)).toEqual([
      expect.objectContaining({ revision: 2, state: 'AWAITING_APPROVAL' }),
    ]);
    expect(out.batch.overlays[0]?.cue.headline).toBe('Cue revision 2');
  });

  it.each([
    OVERLAY_END_REASONS.expired,
    OVERLAY_END_REASONS.superseded,
    OVERLAY_END_REASONS.periodEnded,
  ])(
    'keeps a waiting cue waiting when the scheduler closes its slot (%s)',
    (reason) => {
      const batch = emptyBatch();
      end(batch, reason);
      const out = applyEditorialPolicy(KEY, manual('AWAITING_APPROVAL'), batch);
      expect(out.batch.drafts).toEqual([]);
      expect(out.batch.overlayEnds).toEqual([]);
      expect(out.audits).toEqual([]);
    },
  );

  it.each([OVERLAY_END_REASONS.matchEnded, OVERLAY_END_REASONS.corrected])(
    'lapses a waiting cue at once when the moment is over (%s)',
    (reason) => {
      const batch = emptyBatch();
      end(batch, reason);
      const out = applyEditorialPolicy(KEY, manual('AWAITING_APPROVAL'), batch);
      expect(out.batch.drafts.map((d) => d.type)).toEqual(['overlay.review']);
      expect(reviewOf(out.batch)).toEqual([
        { overlayId: 'ov_a', revision: 1, state: 'APPROVAL_EXPIRED' },
      ]);
      expect(out.batch.overlayEnds).toEqual([
        {
          overlayId: 'ov_a',
          status: 'EXPIRED',
          reason,
          editorial: { state: 'APPROVAL_EXPIRED', reason },
        },
      ]);
      expect(out.audits.map((a) => a.action)).toEqual([
        'overlay.approval-expired',
      ]);
    },
  );

  it('opens the wall-clock window on the first copy and keeps it for later revisions', () => {
    const timing = { nowMs: 5_000_000, windowMs: 45_000 };
    const first = emptyBatch();
    publish(first, cue());
    const opened = applyEditorialPolicy(KEY, manual(), first, timing);
    expect(opened.batch.overlays[0]?.editorial?.approvalDeadline).toEqual(
      new Date(5_045_000),
    );
    const revised = emptyBatch();
    publish(revised, cue(2));
    const kept = applyEditorialPolicy(
      KEY,
      manual('AWAITING_APPROVAL'),
      revised,
      { ...timing, nowMs: 5_020_000 },
    );
    expect(kept.batch.overlays[0]?.editorial?.approvalDeadline).toBeUndefined();
  });

  it('keeps a cue offered and flushed in the same batch waiting', () => {
    const batch = emptyBatch();
    publish(batch, cue());
    end(batch, OVERLAY_END_REASONS.periodEnded);
    const out = applyEditorialPolicy(KEY, manual(), batch);
    expect(reviewOf(out.batch).map((p) => p.state)).toEqual([
      'AWAITING_APPROVAL',
    ]);
    expect(out.batch.overlayEnds).toEqual([]);
    expect(out.batch.drafts.some((d) => d.type === 'overlay.publish')).toBe(
      false,
    );
  });

  it('leaves an approved cue to the sweep and withholds new copy for it', () => {
    const batch = emptyBatch();
    publish(batch, cue(2));
    end(batch, OVERLAY_END_REASONS.expired, 2);
    const out = applyEditorialPolicy(KEY, manual('APPROVED'), batch);
    expect(out.batch.drafts).toEqual([]);
    expect(out.batch.overlays).toEqual([]);
    expect(out.batch.overlayEnds).toEqual([]);
    expect(out.audits).toEqual([
      expect.objectContaining({
        action: 'overlay.blocked',
        reason: 'APPROVED_COPY_LOCKED',
      }),
    ]);
  });

  it('drops every later revision and end of a rejected cue', () => {
    const batch = emptyBatch();
    publish(batch, cue(2));
    end(batch, OVERLAY_END_REASONS.expired, 2);
    const out = applyEditorialPolicy(KEY, manual('REJECTED'), batch);
    expect(out.batch.drafts).toEqual([]);
    expect(out.batch.overlays).toEqual([]);
    expect(out.batch.overlayEnds).toEqual([]);
  });

  it('withholds a new revision of a cue that aired before MANUAL was set', () => {
    const batch = emptyBatch();
    publish(batch, cue(2));
    const out = applyEditorialPolicy(
      KEY,
      manual(undefined, { aired: new Set(['ov_a']) }),
      batch,
    );
    expect(out.batch.drafts).toEqual([]);
    expect(out.audits[0]?.reason).toBe('MANUAL_REVISION_WITHHELD');
  });

  it('lets a freeze outrank MANUAL: a new cue is held, not queued', () => {
    const batch = emptyBatch();
    publish(batch, cue());
    const out = applyEditorialPolicy(
      KEY,
      manual(undefined, { mode: 'FROZEN' }),
      batch,
    );
    expect(out.batch.drafts).toEqual([]);
    expect(out.batch.overlays[0]?.editorial?.state).toBe('HELD');
  });
});
