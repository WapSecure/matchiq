import { StreamMessage } from '@matchiq/contracts';
import {
  PostgresEditorialUnitOfWork,
  PostgresPipelineUnitOfWork,
  createDatabase,
  type DatabaseHandle,
} from '@matchiq/db';
import {
  auditsOf,
  insertInsight,
  insertOverlay,
  messagesOf,
  reason,
  seedDemoTemplates,
  startSession,
} from '../../test/editorial-fixtures';
import { SseClient } from '../../test/sse-client';
import {
  AUTH_HEADER,
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';
import { retractInTx } from './editorial-writes';

jest.setTimeout(30_000);

const ROLLBACK = 'rollback';

describe('Editorial control API (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let fixtureId: string;

  beforeAll(async () => {
    t = await startTestApp();
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 2 });
    await seedDemoTemplates(t);
    fixtureId = await startSession(t);
  });

  afterAll(async () => {
    await db.close();
    await t.close();
  });

  const retract = (overlayId: string, headers = AUTH_HEADER) =>
    postJson(`${t.baseUrl}/overlays/${overlayId}/retract`, reason, headers);

  describe('authorization', () => {
    it.each([
      ['/overlays/ov_any/retract'],
      ['/insights/in_any/suppress'],
      ['/fixtures/fx_any/editorial/freeze'],
      ['/editorial/kill-switch/activate'],
    ])('answers 401 problem details for %s without a key', async (path) => {
      const res = await postJson(`${t.baseUrl}${path}`, reason, {});
      expect(res.status).toBe(401);
      expect(res.headers.get('content-type')).toContain(
        'application/problem+json',
      );
      expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:unauthorized');
    });

    it('answers 401 for a wrong key and 401 for audit reads without one', async () => {
      const wrong = { authorization: `Bearer ${'w'.repeat(48)}` };
      expect((await retract('ov_any', wrong)).status).toBe(401);
      expect((await fetch(`${t.baseUrl}/audit-events`)).status).toBe(401);
    });

    it('rejects a missing or blank reason with a 422 validation problem', async () => {
      const res = await postJson(`${t.baseUrl}/overlays/ov_any/retract`, {
        reason: '  ',
      });
      expect(res.status).toBe(422);
    });
  });

  describe('retract', () => {
    it('takes a live cue off air with overlay.retract and an audit row in the same commit', async () => {
      await insertOverlay(t, fixtureId, { overlayId: 'ov_r1' });
      const client = await SseClient.connect(
        `${t.baseUrl}/fixtures/${fixtureId}/stream`,
      );
      const res = await postJson(
        `${t.baseUrl}/overlays/ov_r1/retract`,
        reason,
        {
          ...AUTH_HEADER,
          'x-request-id': 'req-retract-0001',
        },
      );
      expect(res.status).toBe(200);
      const body = await jsonOf<{ changed: boolean; auditId: string }>(res);
      expect(body).toMatchObject({
        overlayId: 'ov_r1',
        status: 'RETRACTED',
        changed: true,
      });

      const [message] = await messagesOf(t.sql, fixtureId, 'overlay.retract');
      expect(message?.message.payload).toEqual({
        overlayId: 'ov_r1',
        revision: 1,
        reason: 'retracted by producer',
        cause: 'PRODUCER',
      });
      const [audit] = await auditsOf(t.sql, 'overlay.retracted');
      expect(audit).toMatchObject({
        id: body.auditId,
        actor: 'operator',
        actor_type: 'OPERATOR',
        target_type: 'overlay',
        target_id: 'ov_r1',
        fixture_id: fixtureId,
        reason: reason.reason,
        request_id: 'req-retract-0001',
        before: { status: 'LIVE', revision: 1 },
        after: { status: 'RETRACTED', revision: 1 },
      });
      const row = await t.sql.query(
        "select status, editorial_state from overlay_cues where overlay_id = 'ov_r1'",
      );
      expect(row.rows[0]).toEqual({
        status: 'RETRACTED',
        editorial_state: 'RETRACTED',
      });

      await client.waitFor((c) =>
        c.frames.some((f) => f.event === 'overlay.retract'),
      );
      const frame = client.frames.find((f) => f.event === 'overlay.retract');
      expect(StreamMessage.parse(JSON.parse(frame?.data ?? '{}')).type).toBe(
        'overlay.retract',
      );
      await client.close();
    });

    it('is a no-op the second time and writes nothing new', async () => {
      const res = await retract('ov_r1');
      expect(res.status).toBe(200);
      expect(await jsonOf(res)).toMatchObject({
        changed: false,
        auditId: null,
      });
      expect(
        await messagesOf(t.sql, fixtureId, 'overlay.retract'),
      ).toHaveLength(1);
      expect(await auditsOf(t.sql, 'overlay.retracted')).toHaveLength(1);
    });

    it('replays an Idempotency-Key and rejects the key with another body', async () => {
      await insertOverlay(t, fixtureId, { overlayId: 'ov_r2' });
      const headers = { ...AUTH_HEADER, 'idempotency-key': 'retract-r2' };
      const first = await retract('ov_r2', headers);
      const second = await retract('ov_r2', headers);
      expect(second.headers.get('idempotent-replayed')).toBe('true');
      expect(await jsonOf(second)).toEqual(await jsonOf(first));
      const other = await postJson(
        `${t.baseUrl}/overlays/ov_r2/retract`,
        { reason: 'a different reason' },
        headers,
      );
      expect(other.status).toBe(422);
    });

    it('answers 404 for an unknown cue and 409 for one that is not on air', async () => {
      expect((await retract('ov_missing')).status).toBe(404);
      await insertOverlay(t, fixtureId, {
        overlayId: 'ov_r3',
        status: 'EXPIRED',
      });
      const res = await retract('ov_r3');
      expect(res.status).toBe(409);
      expect((await jsonOf(res)).type).toBe(
        'urn:matchiq:problem:overlay-not-on-air',
      );
    });

    it('rolls back the row, the message and the audit row together', async () => {
      await insertOverlay(t, fixtureId, { overlayId: 'ov_r4' });
      const before = (await auditsOf(t.sql, 'overlay.retracted')).length;
      const key = { orgId: t.env.DEMO_ORG_ID, fixtureId };
      const ctx = {
        actor: {
          type: 'OPERATOR' as const,
          id: 'operator',
          orgId: key.orgId,
          permissions: new Set<never>(),
        },
        reason: 'rollback test',
      };
      await expect(
        new PostgresEditorialUnitOfWork(db.db).transaction(async (tx) => {
          await tx.lockFixture(key);
          const overlay = await tx.overlayForUpdate(key, 'ov_r4');
          if (overlay === null) throw new Error('missing');
          await retractInTx(
            tx,
            { key, overlay, cause: 'PRODUCER', now: new Date().toISOString() },
            ctx,
          );
          throw new Error(ROLLBACK);
        }),
      ).rejects.toThrow(ROLLBACK);
      expect((await auditsOf(t.sql, 'overlay.retracted')).length).toBe(before);
      const rows = await t.sql.query(
        "select status from overlay_cues where overlay_id = 'ov_r4'",
      );
      expect(rows.rows[0]?.status).toBe('LIVE');
      const retracts = await messagesOf(t.sql, fixtureId, 'overlay.retract');
      expect(
        retracts.some((m) => m.message.payload['overlayId'] === 'ov_r4'),
      ).toBe(false);
    });
  });

  describe('suppress', () => {
    it('suppresses a pending insight, retracts its live cue and blocks the publication claim', async () => {
      await insertInsight(t, fixtureId, { insightId: 'in_s1' });
      await insertOverlay(t, fixtureId, {
        overlayId: 'ov_s1',
        insightId: 'in_s1',
      });
      const res = await postJson(
        `${t.baseUrl}/insights/in_s1/suppress`,
        reason,
      );
      expect(res.status).toBe(200);
      expect(await jsonOf(res)).toMatchObject({
        status: 'REJECTED',
        changed: true,
        retractedOverlayId: 'ov_s1',
      });
      const retracts = await messagesOf(t.sql, fixtureId, 'overlay.retract');
      expect(retracts.at(-1)?.message.payload['cause']).toBe(
        'INSIGHT_SUPPRESSED',
      );
      const [audit] = await auditsOf(t.sql, 'insight.suppressed');
      expect(audit).toMatchObject({
        target_id: 'in_s1',
        after: { status: 'REJECTED', editorialState: 'SUPPRESSED' },
      });

      const claimed = await new PostgresPipelineUnitOfWork(db.db).transaction(
        (tx) =>
          tx.claimPublication(
            { orgId: t.env.DEMO_ORG_ID, fixtureId },
            'in_s1',
            'AGENT',
          ),
      );
      expect(claimed).toBe(false);
      const again = await postJson(
        `${t.baseUrl}/insights/in_s1/suppress`,
        reason,
      );
      expect(await jsonOf(again)).toMatchObject({ changed: false });
    });

    it('answers 409 for an insight whose narratives are already published', async () => {
      await insertInsight(t, fixtureId, {
        insightId: 'in_s2',
        publication: 'TEMPLATE',
      });
      const res = await postJson(
        `${t.baseUrl}/insights/in_s2/suppress`,
        reason,
      );
      expect(res.status).toBe(409);
      expect((await jsonOf(res)).type).toBe(
        'urn:matchiq:problem:insight-already-published',
      );
      expect(
        (await postJson(`${t.baseUrl}/insights/in_nope/suppress`, reason))
          .status,
      ).toBe(404);
    });
  });

  describe('freeze and kill switch', () => {
    const statusOf = async () =>
      jsonOf<{ mode: string; freeze: { active: boolean } }>(
        await fetch(`${t.baseUrl}/fixtures/${fixtureId}/editorial`),
      );

    it('freezes and resumes a session with editorial.status messages and audit rows', async () => {
      expect((await statusOf()).mode).toBe('AUTO');
      const frozen = await postJson(
        `${t.baseUrl}/fixtures/${fixtureId}/editorial/freeze`,
        reason,
      );
      expect(await jsonOf(frozen)).toMatchObject({
        changed: true,
        status: { mode: 'FROZEN' },
      });
      const again = await postJson(
        `${t.baseUrl}/fixtures/${fixtureId}/editorial/freeze`,
        reason,
      );
      expect(await jsonOf(again)).toMatchObject({
        changed: false,
        auditId: null,
      });
      expect((await statusOf()).freeze.active).toBe(true);

      const resumed = await postJson(
        `${t.baseUrl}/fixtures/${fixtureId}/editorial/resume`,
        reason,
      );
      expect(await jsonOf(resumed)).toMatchObject({
        changed: true,
        status: { mode: 'AUTO' },
      });
      const modes = (
        await messagesOf(t.sql, fixtureId, 'editorial.status')
      ).map((m) => m.message.payload['mode']);
      expect(modes).toEqual(['FROZEN', 'AUTO']);
      expect(await auditsOf(t.sql, 'editorial.frozen')).toHaveLength(1);
      expect(await auditsOf(t.sql, 'editorial.resumed')).toHaveLength(1);
      expect(
        (
          await postJson(
            `${t.baseUrl}/fixtures/fx_nope/editorial/freeze`,
            reason,
          )
        ).status,
      ).toBe(404);
    });

    it('activates the kill switch org-wide, clearing live cues, and releases it', async () => {
      const second = await startSession(t);
      await insertOverlay(t, second, { overlayId: 'ov_k1' });
      const res = await postJson(
        `${t.baseUrl}/editorial/kill-switch/activate`,
        reason,
      );
      const body = await jsonOf<{
        fixtureIds: string[];
        retractedOverlayIds: string[];
      }>(res);
      expect(body).toMatchObject({
        changed: true,
        killSwitch: { active: true },
      });
      expect(body.fixtureIds).toEqual(
        expect.arrayContaining([fixtureId, second]),
      );
      expect(body.retractedOverlayIds).toContain('ov_k1');
      expect((await statusOf()).mode).toBe('KILLED');
      const killed = await messagesOf(t.sql, second, 'overlay.retract');
      expect(killed.at(-1)?.message.payload['cause']).toBe('KILL_SWITCH');
      expect(
        (await messagesOf(t.sql, second, 'editorial.status')).at(-1)?.message
          .payload['mode'],
      ).toBe('KILLED');

      const released = await postJson(
        `${t.baseUrl}/editorial/kill-switch/release`,
        reason,
      );
      expect(await jsonOf(released)).toMatchObject({
        changed: true,
        killSwitch: { active: false },
      });
      expect((await statusOf()).mode).toBe('AUTO');
      const public_ = await jsonOf<{ killSwitch: { active: boolean } }>(
        await fetch(`${t.baseUrl}/editorial/kill-switch`),
      );
      expect(public_.killSwitch.active).toBe(false);
      expect(await auditsOf(t.sql, 'kill-switch.activated')).toHaveLength(1);
      expect(await auditsOf(t.sql, 'kill-switch.released')).toHaveLength(1);
    });
  });
});
