import {
  createDatabase,
  findFixturesFolder,
  PostgresPipelineUnitOfWork,
  PostgresTemplateStore,
  seedTemplates,
  type DatabaseHandle,
  type FixtureKey,
} from '@matchiq/db';
import { buildTestFixture } from '@matchiq/db/testing';
import { detectKeyMoments, project } from '@matchiq/football-engine';
import { jsonOf, postJson, startTestApp, type TestApp } from '../test/test-app';

jest.setTimeout(40_000);

const TEMPLATE = 'fx_comeback_42';
const ORG_A = 'org_demo';
const ORG_B = 'org_northbank';

interface Created {
  session: { sessionId: string };
}

/** Spec §40 and invariant I2: one organisation can never reach another's data. */
describe('cross-tenant isolation (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let a: Record<string, string>;
  let b: Record<string, string>;
  let sessionB: string;
  let sessionA: string;
  let insightB: string;

  const startSession = async (headers: Record<string, string>) => {
    const res = await postJson(
      `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
      { speed: 30 },
      headers,
    );
    expect(res.status).toBe(201);
    return (await jsonOf<Created>(res)).session.sessionId;
  };

  const seedInsight = async (key: FixtureKey) => {
    const template = await new PostgresTemplateStore(db.db).get(
      key.orgId,
      TEMPLATE,
    );
    if (template === null) throw new Error('no template');
    const fixture = { ...template.fixture, fixtureId: key.fixtureId };
    const events = template.events.map((e) => ({
      ...e,
      fixtureId: key.fixtureId,
    }));
    const [insight] = detectKeyMoments(project(fixture, events));
    if (insight === undefined) throw new Error('no insight');
    insightB = insight.insightId;
    await new PostgresPipelineUnitOfWork(db.db).transaction((tx) =>
      tx.insertInsights(key, [
        {
          insight,
          revision: 1,
          period: 1,
          detectedSequence: 1,
          publication: 'PENDING',
        },
      ]),
    );
  };

  beforeAll(async () => {
    t = await startTestApp();
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 2 });
    for (const org of [ORG_A, ORG_B])
      await seedTemplates(
        new PostgresTemplateStore(db.db),
        org,
        findFixturesFolder(),
      );
    a = await t.bearer(['producer', 'developer'], ORG_A);
    b = await t.bearer(['producer', 'developer'], ORG_B);
    // Session numbers are per organisation, so B's second session has an id
    // that does not exist in A: a guessed id rather than A's own row.
    await startSession(b);
    sessionB = await startSession(b);
    sessionA = await startSession(a);
    await seedInsight({ orgId: ORG_B, fixtureId: sessionB });
  });

  afterAll(async () => {
    await db.close();
    await t.close();
  });

  const readAs = (headers: Record<string, string>, path: string) =>
    fetch(`${t.baseUrl}${path}`, { headers });

  it('lists only the caller’s own sessions and templates', async () => {
    const listA = await jsonOf<{ items: { sessionId: string }[] }>(
      await readAs(a, '/replay-sessions'),
    );
    expect(listA.items.map((s) => s.sessionId)).toEqual([sessionA]);
    const listB = await jsonOf<{ items: { sessionId: string }[] }>(
      await readAs(b, '/replay-sessions'),
    );
    expect(listB.items.map((s) => s.sessionId)).toContain(sessionB);
    const fixturesA = await jsonOf<{ items: { fixtureId: string }[] }>(
      await readAs(a, '/fixtures'),
    );
    expect(fixturesA.items.map((f) => f.fixtureId)).not.toContain(sessionB);
  });

  it.each([
    '',
    '/events',
    '/state',
    '/insights',
    '/narratives',
    '/overlays',
    '/recap',
    '/agent-runs',
    '/replay',
  ])(
    'answers a guessed id from another organisation with a non-disclosing 404 (%s)',
    async (suffix) => {
      const res = await readAs(a, `/fixtures/${sessionB}${suffix}`);
      expect(res.status).toBe(404);
      const own = await readAs(b, `/fixtures/${sessionB}${suffix}`);
      expect([200, 404]).toContain(own.status);
    },
  );

  it('serves the owner its insight and nobody else', async () => {
    const own = await jsonOf<{ items: unknown[] }>(
      await readAs(b, `/fixtures/${sessionB}/insights`),
    );
    expect(own.items).toHaveLength(1);
    const anonymous = await fetch(`${t.baseUrl}/fixtures/${sessionB}/insights`);
    expect(anonymous.status).toBe(404);
  });

  it('refuses to command or stream another organisation’s session', async () => {
    const command = await postJson(
      `${t.baseUrl}/fixtures/${sessionB}/replay`,
      { action: 'pause' },
      a,
    );
    expect(command.status).toBe(404);
    const ticket = await postJson(
      `${t.baseUrl}/fixtures/${sessionB}/stream-tickets`,
      {},
      a,
    );
    expect(ticket.status).toBe(404);
    const stream = await readAs(a, `/fixtures/${sessionB}/stream`);
    expect(stream.status).toBe(404);
  });

  it('binds a stream ticket to its fixture and organisation', async () => {
    const res = await postJson(
      `${t.baseUrl}/fixtures/${sessionB}/stream-tickets`,
      {},
      b,
    );
    expect(res.status).toBe(201);
    const { ticket } = await jsonOf<{ ticket: string }>(res);
    const elsewhere = await fetch(
      `${t.baseUrl}/fixtures/${sessionA}/stream?ticket=${ticket}`,
    );
    expect(elsewhere.status).toBe(401);
    const controller = new AbortController();
    const own = await fetch(
      `${t.baseUrl}/fixtures/${sessionB}/stream?ticket=${ticket}`,
      { signal: controller.signal },
    );
    expect(own.status).toBe(200);
    controller.abort();
  });

  it('ignores organisation hints in headers, query and body', async () => {
    const fixture = { ...buildTestFixture('fx_spoof'), orgId: ORG_A };
    const res = await postJson(
      `${t.baseUrl}/fixtures?orgId=${ORG_A}`,
      fixture,
      { ...b, 'x-org-id': ORG_A },
    );
    expect(res.status).toBe(422);
    const clean = await postJson(
      `${t.baseUrl}/fixtures`,
      buildTestFixture('fx_spoof'),
      { ...b, 'x-org-id': ORG_A },
    );
    expect(clean.status).toBe(201);
    const { rows } = await t.sql.query<{ org_id: string }>(
      `select org_id from fixtures where fixture_id = 'fx_spoof'`,
    );
    expect(rows).toEqual([{ org_id: ORG_B }]);
    expect((await readAs(a, '/fixtures/fx_spoof')).status).toBe(404);
  });

  it('namespaces identical fixture ids per organisation', async () => {
    for (const headers of [a, b]) {
      const res = await postJson(
        `${t.baseUrl}/fixtures`,
        buildTestFixture('fx_same_id'),
        headers,
      );
      expect(res.status).toBe(201);
    }
    const { rows } = await t.sql.query<{ org_id: string }>(
      `select org_id from fixtures where fixture_id = 'fx_same_id' order by org_id`,
    );
    expect(rows.map((r) => r.org_id)).toEqual([ORG_A, ORG_B]);
  });

  describe('editorial controls', () => {
    const reason = { reason: 'Cross-tenant isolation check' };
    const post = (path: string, headers: Record<string, string>) =>
      postJson(`${t.baseUrl}${path}`, reason, headers);

    it('refuses to suppress, retract, freeze or read another organisation’s items', async () => {
      expect((await post(`/insights/${insightB}/suppress`, a)).status).toBe(
        404,
      );
      expect((await post(`/overlays/ov_${sessionB}/retract`, a)).status).toBe(
        404,
      );
      expect(
        (await post(`/fixtures/${sessionB}/editorial/freeze`, a)).status,
      ).toBe(404);
      expect(
        (await post(`/fixtures/${sessionB}/editorial/resume`, a)).status,
      ).toBe(404);
      expect((await readAs(a, `/fixtures/${sessionB}/editorial`)).status).toBe(
        404,
      );
    });

    it('lets the owner suppress its insight and audits the real user', async () => {
      expect((await post(`/insights/${insightB}/suppress`, b)).status).toBe(
        200,
      );
      const page = await jsonOf<{
        items: { action: string; actor: { type: string; id: string } }[];
      }>(await readAs(b, '/audit-events?action=insight.suppressed'));
      expect(page.items).toEqual([
        expect.objectContaining({
          actor: { type: 'USER', id: `user-${ORG_B}-producer-developer` },
        }),
      ]);
    });

    it('scopes the kill switch to the organisation that pulls it', async () => {
      expect((await post('/editorial/kill-switch/activate', a)).status).toBe(
        200,
      );
      const killA = await jsonOf<{ killSwitch: { active: boolean } }>(
        await readAs(a, '/editorial/kill-switch'),
      );
      const killB = await jsonOf<{ killSwitch: { active: boolean } }>(
        await readAs(b, '/editorial/kill-switch'),
      );
      expect([killA.killSwitch.active, killB.killSwitch.active]).toEqual([
        true,
        false,
      ]);
      expect((await post('/editorial/kill-switch/release', a)).status).toBe(
        200,
      );
    });

    it('never lists another organisation’s audit records', async () => {
      const pageA = await jsonOf<{ items: { target: { id: string } }[] }>(
        await readAs(a, '/audit-events?limit=100'),
      );
      const ids = pageA.items.map((e) => e.target.id);
      expect(ids).not.toContain(insightB);
      expect(ids).not.toContain(sessionB);
      const { rows } = await t.sql.query<{ n: number }>(
        `select count(*)::int as n from audit_events where org_id = $1`,
        [ORG_A],
      );
      expect(pageA.items).toHaveLength(Math.min(rows[0]?.n ?? 0, 100));
    });
  });

  it('writes every audit row in the actor’s own organisation, with the real actor', async () => {
    const { rows } = await t.sql.query<{
      org_id: string;
      actor: string;
      action: string;
      target_id: string;
    }>(
      `select org_id, actor, action, target_id from audit_events
       where action = 'replay.session.created' order by org_id, target_id`,
    );
    expect(rows.map((r) => [r.org_id, r.target_id, r.actor])).toEqual([
      [ORG_A, sessionA, `user-${ORG_A}-producer-developer`],
      [ORG_B, 'fx_comeback_42_s1', `user-${ORG_B}-producer-developer`],
      [ORG_B, sessionB, `user-${ORG_B}-producer-developer`],
    ]);
  });
});
