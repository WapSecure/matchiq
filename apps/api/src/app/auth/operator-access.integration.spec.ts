import { buildTestEvent, buildTestFixture } from '@matchiq/db/testing';
import {
  batchOf,
  countRows,
  postJson,
  jsonOf,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(20_000);

describe('Operator access and rate limits (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp({ RATE_LIMIT_PER_MINUTE: '8' });
  });

  afterAll(() => t.close());

  it('answers 401 problem details without a bearer key', async () => {
    const res = await postJson(
      `${t.baseUrl}/fixtures`,
      buildTestFixture('fx_noauth'),
      {},
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('Bearer');
    expect(res.headers.get('content-type')).toContain(
      'application/problem+json',
    );
    expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:unauthorized');
  });

  it('answers 401 for a wrong key and never writes', async () => {
    const wrong = { authorization: `Bearer ${'w'.repeat(48)}` };
    const create = await postJson(
      `${t.baseUrl}/fixtures`,
      buildTestFixture('fx_wrongkey'),
      wrong,
    );
    const ingest = await postJson(
      `${t.baseUrl}/fixtures/fx_wrongkey/events:batch`,
      batchOf('fx_wrongkey', [buildTestEvent('fx_wrongkey', 0)]),
      wrong,
    );
    expect([create.status, ingest.status]).toEqual([401, 401]);
    expect(await countRows(t.sql, 'fixtures')).toBe(0);
  });

  it('keeps reads anonymous', async () => {
    expect((await fetch(`${t.baseUrl}/fixtures`)).status).toBe(200);
  });

  it('rate limits per client with a 429 problem', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      statuses.push((await fetch(`${t.baseUrl}/fixtures`)).status);
    }
    const limited = statuses.find((s) => s === 429);
    expect(limited).toBe(429);
    const res = await fetch(`${t.baseUrl}/fixtures`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).not.toBeNull();
    expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:rate-limited');
  });
});
