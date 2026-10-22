import type { OverlayCue } from '@matchiq/contracts';
import type { EditorialView, OverlayEditorialState } from '@matchiq/db';
import { OVERLAY_END_REASONS, OVERLAY_TIMING } from '../constants';
import {
  applyEditorialPolicy,
  editorialIds,
  gateAudits,
} from './editorial-policy';
import { emptyBatch, streamDraft, type PipelineBatch } from './pipeline-batch';

const KEY = { orgId: 'org_demo', fixtureId: 'fx_test' };

const cue = (name: string, revision = 1): OverlayCue => ({
  schemaVersion: 1,
  overlayId: `ov_${name}`,
  fixtureId: KEY.fixtureId,
  insightId: `in_${name}`,
  revision,
  kind: 'KEY_MOMENT',
  priority: 70,
  persona: 'BROADCAST',
  locale: 'en-GB',
  clockStartMs: 1_000,
  clockEndMs: 8_000,
  maxDisplayMs: OVERLAY_TIMING.maxDisplayMs,
  headline: `Cue ${name}`,
  body: '',
  evidenceEventIds: ['ev_000001'],
  metricRefs: [],
  safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
  status: 'AUTO_APPROVED',
  synthetic: true,
});

const now = '2026-10-22T10:00:00.000Z';

const publish = (batch: PipelineBatch, c: OverlayCue) => {
  batch.drafts.push(streamDraft(KEY.fixtureId, now, 'overlay.publish', c));
  batch.overlays.push({
    cue: c,
    status: 'LIVE',
    period: 1,
    publishedSequence: 5,
  });
};

const end = (batch: PipelineBatch, c: OverlayCue, reason: string) => {
  batch.drafts.push(
    streamDraft(KEY.fixtureId, now, 'overlay.retract', {
      overlayId: c.overlayId,
      revision: c.revision,
      reason,
    }),
  );
  batch.overlayEnds.push({ overlayId: c.overlayId, status: 'EXPIRED', reason });
};

const view = (partial: Partial<EditorialView> = {}): EditorialView => ({
  mode: 'AUTO',
  overlays: new Map<string, OverlayEditorialState>(),
  aired: new Set<string>(),
  suppressedInsights: new Set<string>(),
  ...partial,
});

const types = (batch: PipelineBatch) => batch.drafts.map((d) => d.type);

describe('applyEditorialPolicy', () => {
  it('passes every cue through unchanged in AUTO mode', () => {
    const batch = emptyBatch();
    publish(batch, cue('a'));
    end(batch, cue('a'), OVERLAY_END_REASONS.expired);
    const out = applyEditorialPolicy(KEY, view(), batch);
    expect(out.batch.drafts).toEqual(batch.drafts);
    expect(out.batch.overlays).toEqual(batch.overlays);
    expect(out.audits).toEqual([]);
  });

  it.each([
    ['FROZEN', 'EDITORIAL_FREEZE'],
    ['KILLED', 'KILL_SWITCH'],
  ] as const)(
    'holds a new cue off air while %s and records it with a reason',
    (mode, reason) => {
      const batch = emptyBatch();
      batch.drafts.push(streamDraft(KEY.fixtureId, now, 'heartbeat', {}));
      publish(batch, cue('a'));
      end(batch, cue('a'), OVERLAY_END_REASONS.expired);
      const out = applyEditorialPolicy(KEY, view({ mode }), batch);
      expect(types(out.batch)).toEqual(['heartbeat']);
      expect(out.batch.overlayEnds).toEqual([]);
      expect(out.batch.overlays).toEqual([
        expect.objectContaining({
          status: 'VERIFIED',
          cue: expect.objectContaining({ status: 'VERIFIED' }),
          editorial: { state: 'HELD', reason },
        }),
      ]);
      expect(out.audits).toEqual([
        expect.objectContaining({
          action: 'overlay.held',
          actorType: 'SYSTEM',
          targetId: 'ov_a',
          fixtureId: KEY.fixtureId,
          reason,
        }),
      ]);
    },
  );

  it('withholds a new revision of a cue already on air but keeps its row and its end', () => {
    const batch = emptyBatch();
    publish(batch, cue('a', 2));
    end(batch, cue('a', 2), OVERLAY_END_REASONS.expired);
    const out = applyEditorialPolicy(
      KEY,
      view({ mode: 'FROZEN', aired: new Set(['ov_a']) }),
      batch,
    );
    expect(types(out.batch)).toEqual(['overlay.retract']);
    expect(out.batch.overlays).toEqual([]);
    expect(out.batch.overlayEnds).toHaveLength(1);
    expect(out.audits.map((a) => a.action)).toEqual(['overlay.blocked']);
  });

  it('never re-shows a retracted cue, including its agent revision', () => {
    const batch = emptyBatch();
    publish(batch, cue('a', 2));
    end(batch, cue('a', 2), OVERLAY_END_REASONS.expired);
    const out = applyEditorialPolicy(
      KEY,
      view({ overlays: new Map([['ov_a', 'RETRACTED']]) }),
      batch,
    );
    expect(out.batch.drafts).toEqual([]);
    expect(out.batch.overlays).toEqual([]);
    expect(out.batch.overlayEnds).toEqual([]);
    expect(out.audits).toEqual([
      expect.objectContaining({ action: 'overlay.blocked', targetId: 'ov_a' }),
    ]);
  });

  it('keeps the cue of a suppressed insight off air', () => {
    const batch = emptyBatch();
    publish(batch, cue('a'));
    publish(batch, cue('b'));
    const out = applyEditorialPolicy(
      KEY,
      view({ suppressedInsights: new Set(['in_a']) }),
      batch,
    );
    expect(out.batch.drafts.map((d) => d.payload)).toEqual([cue('b')]);
    expect(out.batch.overlays.map((r) => r.editorial?.state ?? null)).toEqual([
      'SUPPRESSED',
      null,
    ]);
  });

  it('audits a scheduler supersede but not a natural expiry', () => {
    const batch = emptyBatch();
    end(batch, cue('a'), OVERLAY_END_REASONS.superseded);
    end(batch, cue('b'), OVERLAY_END_REASONS.expired);
    const out = applyEditorialPolicy(KEY, view(), batch);
    expect(out.audits).toEqual([
      expect.objectContaining({
        action: 'overlay.retracted',
        actor: 'overlay-scheduler',
        targetId: 'ov_a',
      }),
    ]);
  });

  it('does not mutate the batch it was given', () => {
    const batch = emptyBatch();
    publish(batch, cue('a'));
    applyEditorialPolicy(KEY, view({ mode: 'FROZEN' }), batch);
    expect(batch.drafts).toHaveLength(1);
    expect(batch.overlays[0]?.status).toBe('LIVE');
  });
});

describe('editorialIds and gateAudits', () => {
  it('collects the overlay and insight ids a batch touches', () => {
    const batch = emptyBatch();
    publish(batch, cue('a'));
    end(batch, cue('b'), OVERLAY_END_REASONS.expired);
    expect(editorialIds(batch)).toEqual({
      overlayIds: ['ov_a', 'ov_b'],
      insightIds: ['in_a'],
    });
  });

  it('writes one audit row per insight with gate rejections', () => {
    const batch = emptyBatch();
    const report = {
      source: 'AGENT' as const,
      publishedNarratives: 12,
      templateNarratives: 1,
      overlayRevision: null,
    };
    batch.completions.push(
      {
        insightId: 'in_a',
        completion: {
          status: 'PUBLISHED',
          gateReport: {
            ...report,
            rejected: [
              {
                item: 'NARRATIVE',
                source: 'AGENT',
                codes: ['UNSUPPORTED_NUMBER'],
                details: ['number 7 is not a cited value'],
              },
            ],
          },
        },
      },
      {
        insightId: 'in_b',
        completion: {
          status: 'PUBLISHED',
          gateReport: { ...report, rejected: [] },
        },
      },
    );
    const audits = gateAudits(KEY, batch);
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'publication.gated',
        targetType: 'insight',
        targetId: 'in_a',
        details: {
          rejected: [
            {
              item: 'NARRATIVE',
              source: 'AGENT',
              codes: ['UNSUPPORTED_NUMBER'],
            },
          ],
        },
      }),
    ]);
  });
});
