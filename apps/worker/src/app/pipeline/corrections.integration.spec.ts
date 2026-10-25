import type { FixtureKey } from '@matchiq/db';
import {
  countOf,
  readStream,
  replayToEnd,
  startTestWorker,
  streamHash,
  type TestWorker,
} from '../../test/test-worker';

import { overlayIdFor } from './artifacts';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_disallowed-goal_42';

describe('a correction retracts its moment downstream (integration)', () => {
  let t: TestWorker;
  let key: FixtureKey;
  let insightId: string;

  const rows = async <T>(sql: string, params: unknown[]) =>
    (await t.db.pool.query(sql, params)).rows as T[];

  beforeAll(async () => {
    t = await startTestWorker();
    key = await replayToEnd(t, TEMPLATE);
    const stream = await readStream(t, key);
    const goalIds = new Set(
      stream.flatMap((m) =>
        m.type === 'insight.detected' && m.payload.kind === 'GOAL'
          ? [m.payload.insightId]
          : [],
      ),
    );
    const retract = stream.find(
      (m) => m.type === 'insight.retract' && goalIds.has(m.payload.insightId),
    );
    if (retract?.type !== 'insight.retract') throw new Error('no retraction');
    insightId = retract.payload.insightId;
  });

  afterAll(() => t.close());

  it('announces the retraction and pulls the live cue over the stream', async () => {
    const stream = await readStream(t, key);
    expect(countOf(stream, 'insight.retract')).toBe(2);
    const pulled = stream.filter(
      (m) =>
        m.type === 'overlay.retract' &&
        m.payload.cause === 'CORRECTION' &&
        m.payload.overlayId === overlayIdFor(insightId),
    );
    expect(pulled).toHaveLength(1);
    const detected = stream.find(
      (m) => m.type === 'insight.detected' && m.payload.insightId === insightId,
    );
    expect(detected?.payload).toMatchObject({ kind: 'GOAL' });
  });

  it('marks the insight, its narratives and its cue as retracted', async () => {
    const params = [key.orgId, key.fixtureId, insightId];
    const [insight] = await rows<{ status: string; editorial_state: string }>(
      `select status, editorial_state from insights
       where org_id = $1 and fixture_id = $2 and insight_id = $3`,
      params,
    );
    expect(insight).toEqual({
      status: 'REJECTED',
      editorial_state: 'RETRACTED',
    });
    const narratives = await rows<{ retracted: boolean }>(
      `select retracted_at is not null as retracted from narratives
       where org_id = $1 and fixture_id = $2 and insight_id = $3`,
      params,
    );
    expect(narratives.length).toBeGreaterThan(0);
    expect(narratives.every((n) => n.retracted)).toBe(true);
    const [cue] = await rows<{ status: string; editorial_state: string }>(
      `select status, editorial_state from overlay_cues
       where org_id = $1 and fixture_id = $2 and insight_id = $3`,
      params,
    );
    expect(cue).toEqual({ status: 'RETRACTED', editorial_state: 'RETRACTED' });
    const served = await t.reader.narratives(key, {});
    expect(served.some((n) => n.insightId === insightId)).toBe(false);
  });

  it('audits the retraction once, as the system', async () => {
    const audits = await rows<{ actor: string; actor_type: string }>(
      `select actor, actor_type from audit_events
       where action = 'insight.retracted' and fixture_id = $1 and target_id = $2`,
      [key.fixtureId, insightId],
    );
    expect(audits).toEqual([{ actor: 'system:worker', actor_type: 'SYSTEM' }]);
  });

  it('keeps the moment in the recap and fact-checks, marked as ruled out', async () => {
    const recap = await t.reader.recap(key);
    const moment = recap?.keyMoments.find((m) => m.insightId === insightId);
    expect(moment?.retracted?.reason).toMatch(/ruled out/i);
    expect(moment?.narratives).toEqual([]);
    expect(recap?.finalSnapshot.score).toEqual({ home: 2, away: 1 });
    const traces = await t.reader.traces(key);
    const trace = traces.find((x) => x.insightId === insightId);
    expect(trace?.editorial.insight).toBe('RETRACTED');
  });

  it('replays to the same stream in a fresh database', async () => {
    const first = await readStream(t, key);
    const other = await startTestWorker();
    try {
      const again = await replayToEnd(other, TEMPLATE);
      expect(streamHash(await readStream(other, again))).toBe(
        streamHash(first),
      );
    } finally {
      await other.close();
    }
  });
});
