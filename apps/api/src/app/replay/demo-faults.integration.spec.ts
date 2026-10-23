import {
  findFixturesFolder,
  seedTemplates,
  createDatabase,
  PostgresTemplateStore,
} from '@matchiq/db';
import {
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(30_000);

const TEMPLATE = 'fx_comeback_42';
const PLAN = { scenario: 'MODEL_TIMEOUT', insightKinds: ['GOAL'] };

const seed = async (t: TestApp): Promise<void> => {
  const db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
  await seedTemplates(
    new PostgresTemplateStore(db.db),
    t.env.DEMO_ORG_ID,
    findFixturesFolder(),
  );
  await db.close();
};

const create = (t: TestApp, body: object) =>
  postJson(`${t.baseUrl}/fixtures/${TEMPLATE}/sessions`, body, {});

describe('Demo fault plans on session create (integration, ADR-0020)', () => {
  describe('with DEMO_FAULTS_ENABLED=false', () => {
    let t: TestApp;
    beforeAll(async () => {
      t = await startTestApp({ DEMO_FAULTS_ENABLED: 'false' });
      await seed(t);
    });
    afterAll(() => t.close());

    it('refuses a fault plan with a 403 problem', async () => {
      const res = await create(t, { speed: 30, faultPlan: PLAN });
      expect(res.status).toBe(403);
      const problem = await jsonOf(res);
      expect(problem.type).toContain('demo-faults-disabled');
    });

    it('still creates ordinary sessions without one', async () => {
      const res = await create(t, { speed: 30 });
      expect(res.status).toBe(201);
      const body = await jsonOf<{ session: Record<string, unknown> }>(res);
      expect(body.session).not.toHaveProperty('faultPlan');
    });
  });

  describe('with DEMO_FAULTS_ENABLED=true', () => {
    let t: TestApp;
    beforeAll(async () => {
      t = await startTestApp({ DEMO_FAULTS_ENABLED: 'true' });
      await seed(t);
    });
    afterAll(() => t.close());

    it('stores the validated plan and shows it on the session', async () => {
      const res = await create(t, { speed: 30, faultPlan: PLAN });
      expect(res.status).toBe(201);
      const body = await jsonOf<{
        session: { sessionId: string; faultPlan: unknown };
      }>(res);
      expect(body.session.faultPlan).toEqual(PLAN);
      const list = await jsonOf<{
        items: { sessionId: string; faultPlan?: unknown }[];
      }>(await fetch(`${t.baseUrl}/replay-sessions`));
      const listed = list.items.find(
        (s) => s.sessionId === body.session.sessionId,
      );
      expect(listed?.faultPlan).toEqual(PLAN);
    });

    it('rejects an unknown scenario as a validation problem', async () => {
      const res = await create(t, {
        speed: 30,
        faultPlan: { scenario: 'REAL_OUTAGE' },
      });
      expect(res.status).toBe(422);
    });
  });
});
