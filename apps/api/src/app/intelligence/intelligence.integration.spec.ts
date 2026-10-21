import { SCHEMA_VERSION, type Narrative } from '@matchiq/contracts';
import {
  createDatabase,
  findFixturesFolder,
  PostgresPipelineUnitOfWork,
  PostgresSessionStore,
  PostgresTemplateStore,
  seedTemplates,
  type DatabaseHandle,
  type FixtureKey,
} from '@matchiq/db';
import {
  detectKeyMoments,
  project,
  toSnapshot,
} from '@matchiq/football-engine';
import { jsonOf, startTestApp, type TestApp } from '../../test/test-app';

jest.setTimeout(30_000);

const narrative = (
  insightId: string,
  fixtureId: string,
  persona: Narrative['persona'],
  locale: Narrative['locale'],
): Narrative => ({
  schemaVersion: SCHEMA_VERSION,
  narrativeId: `nr_${persona}_${locale}`.replace('-', ''),
  fixtureId,
  insightId,
  persona,
  locale,
  headline: `${persona} ${locale}`,
  body: 'Grounded copy.',
  citations: ['ev_000001'],
  source: 'TEMPLATE',
  localeFallback: false,
  createdAt: '2026-10-24T15:00:00.000Z',
});

describe('Intelligence read API (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let key: FixtureKey;
  const get = (path: string) =>
    fetch(`${t.baseUrl}/fixtures/${key.fixtureId}/${path}`);

  beforeAll(async () => {
    t = await startTestApp();
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    const templates = new PostgresTemplateStore(db.db);
    await seedTemplates(templates, t.env.DEMO_ORG_ID, findFixturesFolder());
    const created = await new PostgresSessionStore(db.db).create({
      orgId: t.env.DEMO_ORG_ID,
      templateId: 'fx_comeback_42',
      speed: 30,
    });
    if (created === null) throw new Error('no session');
    key = { orgId: t.env.DEMO_ORG_ID, fixtureId: created.fixture.fixtureId };
  });

  afterAll(async () => {
    await db.close();
    await t.close();
  });

  it('answers 404 problems before the worker has projected anything', async () => {
    expect((await jsonOf(await get('state'))).type).toBe(
      'urn:matchiq:problem:state-not-found',
    );
    expect((await jsonOf(await get('recap'))).type).toBe(
      'urn:matchiq:problem:recap-not-ready',
    );
    expect(await jsonOf(await get('insights'))).toEqual({ items: [] });
    const unknown = await fetch(`${t.baseUrl}/fixtures/fx_unknown/insights`);
    expect(unknown.status).toBe(404);
    expect((await jsonOf(unknown)).type).toBe(
      'urn:matchiq:problem:fixture-not-found',
    );
  });

  it('serves the read models the worker writes', async () => {
    const template = await new PostgresTemplateStore(db.db).get(
      key.orgId,
      'fx_comeback_42',
    );
    if (template === null) throw new Error('no template');
    const fixture = { ...template.fixture, fixtureId: key.fixtureId };
    const events = template.events.map((e) => ({
      ...e,
      fixtureId: key.fixtureId,
    }));
    const state = project(fixture, events);
    const snapshot = toSnapshot(state);
    const [insight] = detectKeyMoments(state);
    if (insight === undefined) throw new Error('no insight');
    await new PostgresPipelineUnitOfWork(db.db).transaction(async (tx) => {
      await tx.saveSnapshot(key, snapshot);
      await tx.insertInsights(key, [
        {
          insight,
          revision: 1,
          period: 1,
          detectedSequence: 10,
          publication: 'TEMPLATE',
        },
      ]);
      await tx.insertNarratives(key, [
        narrative(insight.insightId, key.fixtureId, 'CASUAL', 'en-GB'),
        narrative(insight.insightId, key.fixtureId, 'CASUAL', 'fr-FR'),
        narrative(insight.insightId, key.fixtureId, 'ANALYST', 'fr-FR'),
      ]);
      await tx.completeInsight(key, insight.insightId, {
        status: 'FALLBACK',
        gateReport: {
          source: 'TEMPLATE',
          publishedNarratives: 3,
          templateNarratives: 3,
          overlayRevision: null,
          rejected: [],
        },
        fallbackReason: 'AI disabled',
      });
    });

    expect(await jsonOf(await get('state'))).toEqual(snapshot);
    const insights = await jsonOf<{
      items: { insightId: string; status: string }[];
    }>(await get('insights'));
    expect(insights.items).toEqual([
      expect.objectContaining({
        insightId: insight.insightId,
        status: 'FALLBACK',
      }),
    ]);
    const french = await jsonOf<{ items: Narrative[] }>(
      await get('narratives?locale=fr-FR'),
    );
    expect(french.items.map((n) => n.persona).sort()).toEqual([
      'ANALYST',
      'CASUAL',
    ]);
    const casualFr = await jsonOf<{ items: Narrative[] }>(
      await get('narratives?persona=CASUAL&locale=fr-FR'),
    );
    expect(casualFr.items).toHaveLength(1);
    expect((await get('narratives?persona=FAN')).status).toBe(422);
    expect(await jsonOf(await get('overlays'))).toEqual({ items: [] });
    const runs = await jsonOf<{ items: unknown[] }>(await get('agent-runs'));
    expect(runs.items).toEqual([
      expect.objectContaining({
        insightId: insight.insightId,
        publication: 'TEMPLATE',
        fallbackReason: 'AI disabled',
        runs: [],
      }),
    ]);
  });
});
