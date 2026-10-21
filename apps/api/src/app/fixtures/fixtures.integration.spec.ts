import { buildTestFixture } from '@matchiq/db/testing';
import {
  AUTH_HEADER,
  countRows,
  postJson,
  jsonOf,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(20_000);

describe('Fixtures API (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(() => t.close());

  it('creates a fixture, audits it and serves it back', async () => {
    const fixture = buildTestFixture('fx_create');
    const res = await postJson(`${t.baseUrl}/fixtures`, fixture);
    expect(res.status).toBe(201);
    expect(await jsonOf(res)).toEqual(fixture);

    const got = await fetch(`${t.baseUrl}/fixtures/fx_create`);
    expect(got.status).toBe(200);
    expect(await got.json()).toEqual(fixture);
    expect(await countRows(t.sql, 'audit_events')).toBeGreaterThanOrEqual(1);
  });

  it('answers 409 when the fixture already exists', async () => {
    const fixture = buildTestFixture('fx_twice');
    await postJson(`${t.baseUrl}/fixtures`, fixture);
    const res = await postJson(`${t.baseUrl}/fixtures`, fixture);
    expect(res.status).toBe(409);
    expect(await jsonOf(res)).toMatchObject({
      type: 'urn:matchiq:problem:fixture-exists',
      status: 409,
    });
  });

  it('lists fixtures for the demo organisation with a bounded limit', async () => {
    await postJson(`${t.baseUrl}/fixtures`, buildTestFixture('fx_list_a'));
    const res = await fetch(`${t.baseUrl}/fixtures?limit=100`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { fixtureId: string }[] };
    expect(body.items.map((f) => f.fixtureId)).toContain('fx_list_a');
    expect((await fetch(`${t.baseUrl}/fixtures?limit=101`)).status).toBe(422);
  });

  it('answers 404 for unknown fixtures and 422 for malformed ids', async () => {
    const missing = await fetch(`${t.baseUrl}/fixtures/fx_missing`);
    expect(missing.status).toBe(404);
    expect((await jsonOf(missing)).type).toBe(
      'urn:matchiq:problem:fixture-not-found',
    );
    expect((await fetch(`${t.baseUrl}/fixtures/not-an-id`)).status).toBe(422);
  });

  it('rejects contract-invalid fixtures with field paths', async () => {
    const fixture = { ...buildTestFixture('fx_bad'), title: '' };
    const res = await postJson(`${t.baseUrl}/fixtures`, fixture);
    expect(res.status).toBe(422);
    expect((await jsonOf(res)).errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '$.title' })]),
    );
  });

  it('replays a create with the same Idempotency-Key', async () => {
    const fixture = buildTestFixture('fx_idem');
    const headers = { ...AUTH_HEADER, 'idempotency-key': 'create-fx-idem' };
    const first = await postJson(`${t.baseUrl}/fixtures`, fixture, headers);
    const second = await postJson(`${t.baseUrl}/fixtures`, fixture, headers);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.headers.get('idempotent-replayed')).toBe('true');
    expect(await second.json()).toEqual(fixture);

    const changed = { ...fixture, title: 'Changed title' };
    const reused = await postJson(`${t.baseUrl}/fixtures`, changed, headers);
    expect(reused.status).toBe(422);
    expect((await jsonOf(reused)).type).toBe(
      'urn:matchiq:problem:idempotency-key-reused',
    );
  });

  it('rejects malformed Idempotency-Key headers', async () => {
    const res = await postJson(
      `${t.baseUrl}/fixtures`,
      buildTestFixture('fx_badkey'),
      { ...AUTH_HEADER, 'idempotency-key': 'has space' },
    );
    expect(res.status).toBe(400);
  });
});
