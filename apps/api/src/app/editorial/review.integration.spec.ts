import {
  createDatabase,
  findFixturesFolder,
  PostgresTemplateStore,
  seedTemplates,
} from '@matchiq/db';
import {
  auditsOf,
  messagesOf,
  reason,
  seedDemoTemplates,
  startSession,
  TEMPLATE,
} from '../../test/editorial-fixtures';
import {
  insertWaitingCue,
  overlayState,
  setSessionClock,
  SLOT,
} from '../../test/review-fixtures';
import {
  AUTH_HEADER,
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(30_000);

const ORG_B = 'org_northbank';
const PROBLEM = 'urn:matchiq:problem:';

describe('Producer approve-before-air (integration, ADR-0023)', () => {
  let t: TestApp;
  let fixtureId: string;

  beforeAll(async () => {
    t = await startTestApp();
    await seedDemoTemplates(t);
    const db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    await seedTemplates(
      new PostgresTemplateStore(db.db),
      ORG_B,
      findFixturesFolder(),
    );
    await db.close();
    fixtureId = await startSession(t);
    await setSessionClock(t, fixtureId, 62_000);
  });

  afterAll(async () => {
    await t.close();
  });

  const review = (
    insightId: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = AUTH_HEADER,
  ) => postJson(`${t.baseUrl}/insights/${insightId}/review`, body, headers);

  const setPolicy = (
    policy: string,
    headers: Record<string, string> = AUTH_HEADER,
  ) =>
    postJson(
      `${t.baseUrl}/fixtures/${fixtureId}/editorial/publish-policy`,
      { policy, reason: reason.reason },
      headers,
    );

  describe('publish policy', () => {
    it('switches a session to MANUAL once, announces it and audits before/after', async () => {
      const res = await setPolicy('MANUAL', {
        ...AUTH_HEADER,
        'idempotency-key': 'policy-manual-1',
      });
      expect(res.status).toBe(200);
      const body = await jsonOf<{
        changed: boolean;
        status: { publishPolicy: { policy: string } };
      }>(res);
      expect(body.changed).toBe(true);
      expect(body.status.publishPolicy.policy).toBe('MANUAL');
      const [status] = await messagesOf(t.sql, fixtureId, 'editorial.status');
      expect(status?.message.payload).toMatchObject({
        mode: 'AUTO',
        publishPolicy: { policy: 'MANUAL' },
      });
      const [audit] = await auditsOf(t.sql, 'editorial.publish-policy.changed');
      expect(audit).toMatchObject({
        target_id: fixtureId,
        reason: reason.reason,
        before: { publishPolicy: 'AUTO' },
        after: { publishPolicy: 'MANUAL' },
      });

      const replay = await setPolicy('MANUAL', {
        ...AUTH_HEADER,
        'idempotency-key': 'policy-manual-1',
      });
      expect(replay.headers.get('idempotent-replayed')).toBe('true');
      const again = await jsonOf<{ changed: boolean }>(
        await setPolicy('MANUAL'),
      );
      expect(again.changed).toBe(false);
      const read = await jsonOf<{ publishPolicy: { policy: string } }>(
        await fetch(`${t.baseUrl}/fixtures/${fixtureId}/editorial`),
      );
      expect(read.publishPolicy.policy).toBe('MANUAL');
    });

    it('refuses viewers, analysts and the anonymous demo with 403', async () => {
      for (const role of ['viewer', 'analyst'] as const) {
        const headers = await t.bearer([role], t.env.DEMO_ORG_ID);
        expect((await setPolicy('AUTO', headers)).status).toBe(403);
      }
      expect((await setPolicy('AUTO', {})).status).toBe(403);
    });

    it('lets a tenant owner set the policy but not approve a cue', async () => {
      const owner = await t.bearer(['tenant-owner'], t.env.DEMO_ORG_ID);
      expect((await setPolicy('MANUAL', owner)).status).toBe(200);
      expect(
        (await review('in_any', { decision: 'APPROVE' }, owner)).status,
      ).toBe(403);
    });
  });

  describe('review', () => {
    it('lists a waiting cue with its copy for producers only', async () => {
      const cue = await insertWaitingCue(t, fixtureId, 'q1');
      const url = `${t.baseUrl}/fixtures/${fixtureId}/overlay-reviews`;
      const list = await jsonOf<{
        items: { overlayId: string; approvalDeadline: string }[];
        serverTime: string;
      }>(await fetch(url, { headers: AUTH_HEADER }));
      expect(list.items).toEqual([
        expect.objectContaining({
          overlayId: cue.overlayId,
          state: 'AWAITING_APPROVAL',
          expiresAtClockMs: SLOT.endMs,
          cue: expect.objectContaining({ headline: cue.headline }),
        }),
      ]);
      const left =
        Date.parse(list.items[0]?.approvalDeadline ?? '') -
        Date.parse(list.serverTime);
      expect(left).toBeGreaterThan(40_000);
      expect(left).toBeLessThanOrEqual(45_000);
      expect((await fetch(url)).status).toBe(403);
    });

    it('approves within bounds: airs in the open slot, streams it and audits before/after', async () => {
      const headers = { ...AUTH_HEADER, 'idempotency-key': 'review-q1' };
      const command = { decision: 'APPROVE', durationMs: 3_000, priority: 95 };
      const res = await review('in_q1', command, headers);
      expect(res.status).toBe(200);
      const body = await jsonOf<{ auditId: string; cue: unknown }>(res);
      expect(body).toMatchObject({
        overlayId: 'ov_q1',
        state: 'APPROVED',
        changed: true,
        cue: {
          status: 'APPROVED',
          priority: 95,
          clockStartMs: 62_000,
          clockEndMs: 65_000,
        },
      });
      expect(await overlayState(t, 'ov_q1')).toMatchObject({
        status: 'LIVE',
        editorial_state: 'APPROVED',
        clock_end_ms: 65_000,
        priority: 95,
      });
      const [aired] = await messagesOf(t.sql, fixtureId, 'overlay.publish');
      expect(aired?.message.payload).toEqual(body.cue);
      const [notice] = await messagesOf(t.sql, fixtureId, 'overlay.review');
      expect(notice?.message.payload).toEqual({
        overlayId: 'ov_q1',
        insightId: 'in_q1',
        revision: 1,
        state: 'APPROVED',
      });
      const [audit] = await auditsOf(t.sql, 'overlay.approved');
      expect(audit).toMatchObject({
        id: body.auditId,
        before: {
          state: 'AWAITING_APPROVAL',
          priority: 70,
          clockEndMs: 67_000,
        },
        after: { state: 'APPROVED', priority: 95, clockEndMs: 65_000 },
      });

      const replay = await review('in_q1', command, headers);
      expect(replay.headers.get('idempotent-replayed')).toBe('true');
      expect(await jsonOf(replay)).toEqual(body);
      const repeat = await jsonOf<{ changed: boolean }>(
        await review('in_q1', { decision: 'APPROVE' }),
      );
      expect(repeat.changed).toBe(false);
      expect(
        await messagesOf(t.sql, fixtureId, 'overlay.publish'),
      ).toHaveLength(1);
    });

    it('lets a producer retract an approved cue that is on air', async () => {
      const res = await postJson(`${t.baseUrl}/overlays/ov_q1/retract`, reason);
      expect(res.status).toBe(200);
    });

    it('rejects with a reason so the cue never airs, then refuses to approve it', async () => {
      await insertWaitingCue(t, fixtureId, 'q2');
      const res = await review('in_q2', {
        decision: 'REJECT',
        reason: 'Not the story we want',
      });
      expect(res.status).toBe(200);
      expect(await jsonOf(res)).toMatchObject({ state: 'REJECTED', cue: null });
      expect(await overlayState(t, 'ov_q2')).toMatchObject({
        status: 'RETRACTED',
        editorial_state: 'REJECTED',
        editorial_reason: 'Not the story we want',
      });
      const [audit] = await auditsOf(t.sql, 'overlay.rejected');
      expect(audit?.reason).toBe('Not the story we want');
      const late = await review('in_q2', { decision: 'APPROVE' });
      expect(late.status).toBe(409);
      expect((await jsonOf(late)).type).toBe(
        `${PROBLEM}overlay-not-awaiting-approval`,
      );
    });

    it('approves after the match-clock slot has closed while the wall-clock window is open', async () => {
      await insertWaitingCue(t, fixtureId, 'q4');
      await setSessionClock(t, fixtureId, SLOT.endMs + 30_000);
      const res = await review('in_q4', { decision: 'APPROVE' });
      expect(res.status).toBe(200);
      expect(await jsonOf(res)).toMatchObject({
        state: 'APPROVED',
        cue: { clockStartMs: 97_000, clockEndMs: 104_000 },
      });
      expect(await overlayState(t, 'ov_q4')).toMatchObject({
        status: 'LIVE',
        editorial_state: 'APPROVED',
        clock_end_ms: 104_000,
      });
      await setSessionClock(t, fixtureId, 62_000);
    });

    it('answers 409 once the window has passed, for a stale revision and while frozen', async () => {
      await insertWaitingCue(t, fixtureId, 'q3');
      const stale = await review('in_q3', { decision: 'APPROVE', revision: 2 });
      expect((await jsonOf(stale)).type).toBe(
        `${PROBLEM}overlay-revision-stale`,
      );

      await postJson(
        `${t.baseUrl}/fixtures/${fixtureId}/editorial/freeze`,
        reason,
      );
      const paused = await review('in_q3', { decision: 'APPROVE' });
      expect((await jsonOf(paused)).type).toBe(
        `${PROBLEM}editorial-air-paused`,
      );
      await postJson(
        `${t.baseUrl}/fixtures/${fixtureId}/editorial/resume`,
        reason,
      );

      await t.sql.query(
        "update overlay_cues set approval_deadline = now() - interval '1 second' where overlay_id = 'ov_q3'",
      );
      const late = await review('in_q3', { decision: 'APPROVE' });
      expect(late.status).toBe(409);
      expect((await jsonOf(late)).type).toBe(
        `${PROBLEM}overlay-approval-expired`,
      );
      expect(await overlayState(t, 'ov_q3')).toMatchObject({
        editorial_state: 'AWAITING_APPROVAL',
      });
      const list = await jsonOf<{ items: { overlayId: string }[] }>(
        await fetch(`${t.baseUrl}/fixtures/${fixtureId}/overlay-reviews`, {
          headers: AUTH_HEADER,
        }),
      );
      expect(list.items.map((i) => i.overlayId)).not.toContain('ov_q3');
    });

    it('validates overrides and refuses viewers', async () => {
      const bad = await review('in_q3', { decision: 'REJECT', priority: 10 });
      expect(bad.status).toBe(422);
      const tooLong = await review('in_q3', {
        decision: 'APPROVE',
        durationMs: 60_000,
      });
      expect(tooLong.status).toBe(422);
      const viewer = await t.bearer(['viewer'], t.env.DEMO_ORG_ID);
      expect(
        (await review('in_q3', { decision: 'APPROVE' }, viewer)).status,
      ).toBe(403);
      expect((await review('in_q3', { decision: 'APPROVE' }, {})).status).toBe(
        403,
      );
    });
  });

  describe('tenant isolation', () => {
    it('never lets another organisation see or review a cue', async () => {
      const b = await t.bearer(['producer'], ORG_B);
      const created = await postJson(
        `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
        { speed: 30 },
        b,
      );
      const other = (await jsonOf<{ fixture: { fixtureId: string } }>(created))
        .fixture.fixtureId;
      await insertWaitingCue(t, other, 'b1', { orgId: ORG_B });
      const a = await t.bearer(['producer'], t.env.DEMO_ORG_ID);
      const list = await fetch(
        `${t.baseUrl}/fixtures/${other}/overlay-reviews`,
        {
          headers: a,
        },
      );
      if (other === fixtureId) {
        expect(
          (await jsonOf<{ items: { overlayId: string }[] }>(list)).items.map(
            (i) => i.overlayId,
          ),
        ).not.toContain('ov_b1');
      } else {
        expect(list.status).toBe(404);
      }
      const res = await review('in_b1', { decision: 'APPROVE' }, a);
      expect(res.status).toBe(404);
      expect(await overlayState(t, 'ov_b1')).toMatchObject({
        editorial_state: 'AWAITING_APPROVAL',
      });
      const own = await fetch(
        `${t.baseUrl}/fixtures/${other}/overlay-reviews`,
        {
          headers: b,
        },
      );
      expect(
        (await jsonOf<{ items: { overlayId: string }[] }>(own)).items.map(
          (i) => i.overlayId,
        ),
      ).toEqual(['ov_b1']);
    });
  });
});
