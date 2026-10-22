import { ProblemDetails } from '@matchiq/contracts';
import {
  createDatabase,
  findFixturesFolder,
  PostgresTemplateStore,
  seedTemplates,
} from '@matchiq/db';
import { API_GLOBAL_PREFIX } from '@matchiq/server-kit';
import {
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';
import { OPENAPI_PATTERNS } from './openapi.constants';
import { API_ROUTES } from './routes';

jest.setTimeout(40_000);

const TEMPLATE = 'fx_comeback_42';
const PUBLIC_URL = 'https://api.matchiq.test';

interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

/** `GET /fixtures/{fixtureId}/events:batch`-style keys from the live Express router. */
const nestRoutes = (t: TestApp): string[] => {
  const express = t.app.getHttpAdapter().getInstance() as {
    router?: { stack: RouterLayer[] };
    _router?: { stack: RouterLayer[] };
  };
  const stack = (express.router ?? express._router)?.stack ?? [];
  const prefix = `/${API_GLOBAL_PREFIX}`;
  return stack.flatMap(({ route }) =>
    route
      ? Object.keys(route.methods).map(
          (method) =>
            `${method.toUpperCase()} ${route.path
              .slice(prefix.length)
              .replace(OPENAPI_PATTERNS.nestParam, '{$1}')
              .replace(OPENAPI_PATTERNS.escapedColon, ':')}`,
        )
      : [],
  );
};

const registryRoutes = (): string[] =>
  API_ROUTES.map((r) => `${r.method.toUpperCase()} ${r.path}`);

const schemaOf = (operationId: string) => {
  const route = API_ROUTES.find((r) => r.operationId === operationId);
  if (route?.success.body.kind !== 'json') throw new Error(operationId);
  return route.success.body.schema;
};

/** Parses a real response with the schema the document publishes for it. */
const expectConforms = async (operationId: string, res: Response) => {
  expect(res.ok).toBe(true);
  const parsed = schemaOf(operationId).safeParse(await res.json());
  expect(parsed.error?.issues ?? []).toEqual([]);
};

describe('OpenAPI contract (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ API_PUBLIC_URL: PUBLIC_URL });
    const db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    await seedTemplates(
      new PostgresTemplateStore(db.db),
      t.env.DEMO_ORG_ID,
      findFixturesFolder(),
    );
    await db.close();
  });

  afterAll(() => t.close());

  it('registers every Nest route, and every registered route exists in Nest', () => {
    const served = nestRoutes(t).sort();
    expect(served.length).toBeGreaterThan(0);
    expect(registryRoutes().sort()).toEqual(served);
  });

  it('serves the document with this deployment as its server', async () => {
    const res = await fetch(`${t.baseUrl}/openapi.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const doc = await jsonOf<{
      openapi: string;
      servers: { url: string }[];
      paths: object;
    }>(res);
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.servers).toEqual([
      expect.objectContaining({ url: `${PUBLIC_URL}/api/v1` }),
    ]);
    expect(Object.keys(doc.paths)).toContain('/fixtures/{fixtureId}/stream');
  });

  it('serves a self-hosted docs page and its assets under a strict CSP', async () => {
    const page = await fetch(`${t.baseUrl}/docs`);
    expect(page.status).toBe(200);
    expect(page.headers.get('content-type')).toContain('text/html');
    expect(page.headers.get('content-security-policy')).toContain(
      "script-src 'self'",
    );
    const html = await page.text();
    expect(html).toContain('/api/v1/docs/swagger-ui-bundle.js');
    expect(html).not.toMatch(/https?:\/\//);

    const init = await fetch(`${t.baseUrl}/docs/docs-init.js`);
    expect(await init.text()).toContain('/api/v1/openapi.json');
    const bundle = await fetch(`${t.baseUrl}/docs/swagger-ui-bundle.js`);
    expect(bundle.headers.get('content-type')).toContain('javascript');
    const css = await fetch(`${t.baseUrl}/docs/swagger-ui.css`);
    expect(css.headers.get('content-type')).toContain('text/css');
    expect((await fetch(`${t.baseUrl}/docs/index.html`)).status).toBe(422);
  });

  it('answers real requests with bodies that match the documented schemas', async () => {
    await expectConforms(
      'listFixtureTemplates',
      await fetch(`${t.baseUrl}/fixture-templates`),
    );
    const created = await postJson(
      `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
      { speed: 30 },
      {},
    );
    const session = (await created.clone().json()) as {
      session: { sessionId: string };
    };
    await expectConforms('createReplaySession', created);
    const id = session.session.sessionId;
    const reads: [string, string][] = [
      ['listReplaySessions', '/replay-sessions'],
      ['getFixture', `/fixtures/${id}`],
      ['listFixtureEvents', `/fixtures/${id}/events?limit=5`],
      ['getReplayStatus', `/fixtures/${id}/replay`],
      ['listInsights', `/fixtures/${id}/insights`],
      ['listNarratives', `/fixtures/${id}/narratives`],
      ['listOverlays', `/fixtures/${id}/overlays`],
      ['listAgentRuns', `/fixtures/${id}/agent-runs`],
      ['getEditorialStatus', `/fixtures/${id}/editorial`],
      ['getKillSwitch', '/editorial/kill-switch'],
      ['listFixtures', '/fixtures'],
      ['getLiveness', '/health/live'],
    ];
    for (const [operationId, path] of reads) {
      await expectConforms(operationId, await fetch(`${t.baseUrl}${path}`));
    }
  });

  it('answers documented problems as RFC 9457 with matchiq types', async () => {
    const res = await fetch(`${t.baseUrl}/fixtures/fx_missing/recap`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    const body = ProblemDetails.parse(await res.json());
    expect(body.type).toBe('urn:matchiq:problem:fixture-not-found');
  });
});

describe('OpenAPI docs disabled (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ API_DOCS_ENABLED: 'false' });
  });

  afterAll(() => t.close());

  it('does not serve the document or the docs page', async () => {
    expect((await fetch(`${t.baseUrl}/openapi.json`)).status).toBe(404);
    expect((await fetch(`${t.baseUrl}/docs`)).status).toBe(404);
  });
});
