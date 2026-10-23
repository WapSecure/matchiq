import { buildTestEvent, buildTestFixture } from '@matchiq/db/testing';
import {
  AUTH_HEADER,
  batchOf,
  countRows,
  DEMO_ORG,
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(30_000);

const OTHER_ORG = 'org_northbank';

/** ADR-0018 authentication and authorisation, end to end through the real API. */
describe('access control (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ RATE_LIMIT_PER_MINUTE: '60' });
  });

  afterAll(() => t.close());

  const createWith = (headers: Record<string, string>, id: string) =>
    postJson(`${t.baseUrl}/fixtures`, buildTestFixture(id), headers);

  it('keeps public reads open to the anonymous demo tenant', async () => {
    expect((await fetch(`${t.baseUrl}/fixtures`)).status).toBe(200);
    const me = await jsonOf<{ kind: string; orgId: string }>(
      await fetch(`${t.baseUrl}/me`),
    );
    expect(me).toMatchObject({ kind: 'anonymous', orgId: DEMO_ORG });
  });

  it('answers 403 with insufficient_scope when the anonymous demo tries to write', async () => {
    const res = await createWith({}, 'fx_anon');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect(res.headers.get('www-authenticate')).toContain(
      'scope="fixtures:write"',
    );
    expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:forbidden');
  });

  it.each([
    ['an expired token', { expiresIn: -600 }, 'The access token has expired'],
    [
      'a token for another API',
      { audience: 'some-other-api' },
      'The access token is not intended for this API',
    ],
    [
      'a token from another issuer',
      { issuer: 'https://evil.example/realms/matchiq' },
      'The access token was issued by an untrusted issuer',
    ],
    [
      'a token signed by a foreign key',
      { rogueKey: true },
      'The access token signature is invalid',
    ],
  ])(
    'rejects %s with 401 and writes nothing',
    async (_label, options, detail) => {
      const headers = await t.bearer(['developer'], DEMO_ORG, options);
      const res = await createWith(headers, 'fx_badtoken');
      expect(res.status).toBe(401);
      expect(res.headers.get('www-authenticate')).toContain(
        'error="invalid_token"',
      );
      expect((await jsonOf(res)).detail).toBe(detail);
      expect((await fetch(`${t.baseUrl}/fixtures`, { headers })).status).toBe(
        401,
      );
    },
  );

  it('rejects a tampered payload that tries to escalate roles', async () => {
    const token = (await t.bearer(['viewer'], DEMO_ORG)).authorization ?? '';
    const [header, , signature] = token.replace('Bearer ', '').split('.');
    const forged = Buffer.from(
      JSON.stringify({
        sub: 'mallory',
        org: DEMO_ORG,
        roles: ['developer', 'tenant-owner'],
        iss: t.issuer.issuer,
        aud: t.issuer.audience,
        exp: Math.floor(Date.now() / 1000) + 300,
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString('base64url');
    const res = await createWith(
      { authorization: `Bearer ${header}.${forged}.${signature}` },
      'fx_forged',
    );
    expect(res.status).toBe(401);
    expect(await countRows(t.sql, 'fixtures')).toBe(0);
  });

  it('refuses a viewer’s write with 403 and audits the denial with the real actor', async () => {
    const res = await createWith(
      await t.bearer(['viewer'], DEMO_ORG),
      'fx_viewer',
    );
    expect(res.status).toBe(403);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const { rows } = await t.sql.query<{
      org_id: string;
      actor: string;
      details: { permission: string };
    }>(
      `select org_id, actor, details from audit_events where action = 'auth.access-denied'`,
    );
    expect(rows).toEqual([
      expect.objectContaining({
        org_id: DEMO_ORG,
        actor: `user-${DEMO_ORG}-viewer`,
        details: expect.objectContaining({ permission: 'fixtures:write' }),
      }),
    ]);
  });

  it('lets token scopes narrow, never widen, a role', async () => {
    const narrowed = await t.bearer(['developer'], DEMO_ORG, {
      claims: { scope: 'openid fixtures:read' },
    });
    expect((await createWith(narrowed, 'fx_narrow')).status).toBe(403);
    expect(
      (await fetch(`${t.baseUrl}/fixtures`, { headers: narrowed })).status,
    ).toBe(200);
    const widened = await t.bearer(['viewer'], DEMO_ORG, {
      claims: { scope: 'fixtures:write events:ingest' },
    });
    expect((await createWith(widened, 'fx_widen')).status).toBe(403);
  });

  it('gives the platform operator no tenant data', async () => {
    const headers = await t.bearer(['platform-operator'], 'org_platform');
    expect((await fetch(`${t.baseUrl}/fixtures`, { headers })).status).toBe(
      403,
    );
  });

  it('rejects tokens without an organisation or a known role', async () => {
    const noOrg = await t.issuer.mint({
      claims: { sub: 'u', roles: ['developer'] },
    });
    const res = await fetch(`${t.baseUrl}/fixtures`, {
      headers: { authorization: `Bearer ${noOrg}` },
    });
    expect(res.status).toBe(401);
  });

  it('lets a developer create and ingest in their own organisation, audited as themselves', async () => {
    const headers = await t.bearer(['developer'], OTHER_ORG);
    expect((await createWith(headers, 'fx_dev')).status).toBe(201);
    const ingest = await postJson(
      `${t.baseUrl}/fixtures/fx_dev/events:batch`,
      batchOf('fx_dev', [buildTestEvent('fx_dev', 0)]),
      headers,
    );
    expect(ingest.status).toBe(202);
    const { rows } = await t.sql.query<{ actor: string; org_id: string }>(
      `select actor, org_id from audit_events where target_id = 'fx_dev' order by created_at`,
    );
    expect(rows).toEqual([
      { actor: `user-${OTHER_ORG}-developer`, org_id: OTHER_ORG },
      { actor: `user-${OTHER_ORG}-developer`, org_id: OTHER_ORG },
    ]);
  });

  it('keeps the dev/CI operator key working only with the right key', async () => {
    expect((await createWith(AUTH_HEADER, 'fx_key')).status).toBe(201);
    const wrong = await createWith(
      { authorization: `Bearer ${'w'.repeat(48)}` },
      'fx_wrongkey',
    );
    expect(wrong.status).toBe(401);
  });

  it('records sign-in and sign-out for a person, never for the anonymous demo', async () => {
    const headers = await t.bearer(['producer'], DEMO_ORG);
    const me = await jsonOf<{ roles: string[]; permissions: string[] }>(
      await fetch(`${t.baseUrl}/me`, { headers }),
    );
    expect(me.roles).toEqual(['producer']);
    expect(me.permissions).toContain('editorial:publish');
    expect(
      (await postJson(`${t.baseUrl}/me/sign-in`, {}, headers)).status,
    ).toBe(204);
    expect(
      (await postJson(`${t.baseUrl}/me/sign-out`, {}, headers)).status,
    ).toBe(204);
    expect((await postJson(`${t.baseUrl}/me/sign-in`, {}, {})).status).toBe(
      401,
    );
    const { rows } = await t.sql.query<{ action: string }>(
      `select action from audit_events where action like 'auth.signed-%' order by created_at`,
    );
    expect(rows.map((r) => r.action)).toEqual([
      'auth.signed-in',
      'auth.signed-out',
    ]);
  });

  it('rate limits per anonymous client with a 429 problem', async () => {
    let last: Response | undefined;
    for (let i = 0; i < 70; i += 1) {
      last = await fetch(`${t.baseUrl}/fixture-templates`);
      if (last.status === 429) break;
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get('retry-after')).not.toBeNull();
    const signedIn = await fetch(`${t.baseUrl}/fixture-templates`, {
      headers: await t.bearer(['viewer'], DEMO_ORG),
    });
    expect(signedIn.status).toBe(200);
  });
});

describe('access control without the anonymous demo (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ AUTH_ANONYMOUS_DEMO_ENABLED: 'false' });
  });

  afterAll(() => t.close());

  it('answers 401 with a bare Bearer challenge when no credential is sent', async () => {
    const res = await fetch(`${t.baseUrl}/fixtures`);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer realm="matchiq"');
    expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:unauthorized');
  });

  it('keeps health public', async () => {
    expect((await fetch(`${t.baseUrl}/health/live`)).status).toBe(200);
  });
});
