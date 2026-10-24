import type { OverlayCue } from '@matchiq/contracts';
import {
  PostgresEditorialUnitOfWork,
  PostgresPipelineUnitOfWork,
  type FixtureKey,
} from '@matchiq/db';
import {
  ORG,
  readStream,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';
import { PipelineWriter } from '../replay/pipeline-writer';
import { emptyBatch, streamDraft, type PipelineBatch } from './pipeline-batch';

jest.setTimeout(120_000);

const WINDOW_MS = 45_000;
const START_MS = Date.parse('2026-10-24T12:00:00.000Z');

describe('manual approval window on the wall clock (integration, ADR-0024)', () => {
  let t: TestWorker;
  let key: FixtureKey;
  let wall = START_MS;

  beforeAll(async () => {
    t = await startTestWorker();
    const created = await t.store.create({
      orgId: ORG,
      templateId: 'fx_comeback_42',
      speed: 30,
    });
    if (created === null) throw new Error('template missing');
    key = { orgId: ORG, fixtureId: created.fixture.fixtureId };
    await new PostgresEditorialUnitOfWork(t.db.db).transaction((tx) =>
      tx.saveControl({
        orgId: ORG,
        scope: 'APPROVAL',
        scopeId: key.fixtureId,
        active: true,
        reason: 'integration test',
        changedBy: 'operator',
      }),
    );
  });

  afterAll(() => t.close());

  const writer = () =>
    new PipelineWriter(
      new PostgresPipelineUnitOfWork(t.db.db),
      WINDOW_MS / 1000,
      () => wall,
    );

  const cue = (name: string): OverlayCue => ({
    schemaVersion: 1,
    overlayId: `ov_${name}`,
    fixtureId: key.fixtureId,
    insightId: `in_${name}`,
    revision: 1,
    kind: 'KEY_MOMENT',
    priority: 70,
    persona: 'BROADCAST',
    locale: 'en-GB',
    clockStartMs: 60_000,
    clockEndMs: 67_000,
    maxDisplayMs: 12_000,
    headline: `Moment ${name}`,
    body: '',
    evidenceEventIds: ['ev_000001'],
    metricRefs: [],
    safeArea: { topPct: 8, rightPct: 6, bottomPct: 10, leftPct: 6 },
    status: 'AUTO_APPROVED',
    synthetic: true,
  });

  const emittedAt = () => new Date(wall).toISOString();

  const offer = (c: OverlayCue): PipelineBatch => {
    const batch = emptyBatch();
    batch.drafts.push(
      streamDraft(key.fixtureId, emittedAt(), 'overlay.publish', c),
    );
    batch.overlays.push({
      cue: c,
      status: 'LIVE',
      period: 1,
      publishedSequence: 5,
    });
    return batch;
  };

  const slotEnds = (c: OverlayCue): PipelineBatch => {
    const batch = emptyBatch();
    batch.drafts.push(
      streamDraft(key.fixtureId, emittedAt(), 'overlay.retract', {
        overlayId: c.overlayId,
        revision: 1,
        reason: 'expired',
      }),
    );
    batch.overlayEnds.push({
      overlayId: c.overlayId,
      status: 'EXPIRED',
      reason: 'expired',
    });
    return batch;
  };

  const row = async (overlayId: string) =>
    (
      await t.db.pool.query<{
        status: string;
        editorial_state: string | null;
        approval_deadline: Date | null;
      }>(
        'select status, editorial_state, approval_deadline from overlay_cues where fixture_id = $1 and overlay_id = $2',
        [key.fixtureId, overlayId],
      )
    ).rows[0];

  it('keeps a cue waiting past its match-clock slot, then lapses it when the wall-clock window passes', async () => {
    const a = cue('a');
    const b = cue('b');
    await writer().write(key, offer(a));
    expect((await row('ov_a'))?.approval_deadline?.getTime()).toBe(
      START_MS + WINDOW_MS,
    );

    wall += 10_000;
    await writer().write(key, slotEnds(a));
    await writer().write(key, offer(b));
    expect(await row('ov_a')).toMatchObject({
      status: 'VERIFIED',
      editorial_state: 'AWAITING_APPROVAL',
    });

    await new PostgresEditorialUnitOfWork(t.db.db).transaction((tx) =>
      tx.airApproved(key, {
        cue: {
          ...b,
          status: 'APPROVED',
          clockStartMs: 90_000,
          clockEndMs: 97_000,
        },
        period: 1,
        reason: null,
      }),
    );

    wall = START_MS + WINDOW_MS + 1_000;
    await writer().write(key, emptyBatch());
    expect(await row('ov_a')).toMatchObject({
      status: 'EXPIRED',
      editorial_state: 'APPROVAL_EXPIRED',
    });
    expect(await row('ov_b')).toMatchObject({
      status: 'LIVE',
      editorial_state: 'APPROVED',
    });

    const stream = await readStream(t, key);
    expect(
      stream.filter(
        (m) =>
          m.type === 'overlay.review' && m.payload.state === 'APPROVAL_EXPIRED',
      ),
    ).toHaveLength(1);
    expect(stream.filter((m) => m.type === 'overlay.publish')).toHaveLength(0);
    const audits = await t.db.pool.query(
      "select 1 from audit_events where fixture_id = $1 and action = 'overlay.approval-expired'",
      [key.fixtureId],
    );
    expect(audits.rowCount).toBe(1);
  });
});
