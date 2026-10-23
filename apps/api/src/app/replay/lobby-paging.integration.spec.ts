import {
  createDatabase,
  encodeCursor,
  findFixturesFolder,
  PostgresTemplateStore,
  seedTemplates,
  type DatabaseHandle,
} from '@matchiq/db';
import {
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(40_000);

const ORG_A = 'org_demo';
const ORG_B = 'org_northbank';
const TEMPLATES = ['fx_comeback_42', 'fx_high-press_42', 'fx_low-event_42'];

interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

type Headers = Record<string, string>;

/** Keyset paging of the lobby lists and `GET /fixtures` (ADR-0005). */
describe('lobby paging (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let a: Headers;
  let b: Headers;
  const sessionsA: string[] = [];
  let sessionB = '';

  const start = async (templateId: string, headers: Headers) => {
    const res = await postJson(
      `${t.baseUrl}/fixtures/${templateId}/sessions`,
      { speed: 30 },
      headers,
    );
    expect(res.status).toBe(201);
    return (await jsonOf<{ session: { sessionId: string } }>(res)).session
      .sessionId;
  };

  const page = async <T>(path: string, headers: Headers = {}) => {
    const res = await fetch(`${t.baseUrl}${path}`, { headers });
    expect(res.status).toBe(200);
    return jsonOf<Page<T>>(res);
  };

  /** Follows `nextCursor` to the end, returning every page. */
  const walk = async <T>(path: string, headers: Headers = {}) => {
    const pages: Page<T>[] = [];
    let cursor: string | null = null;
    do {
      const query: string = cursor ? `&cursor=${cursor}` : '';
      const next: Page<T> = await page<T>(`${path}${query}`, headers);
      pages.push(next);
      cursor = next.nextCursor;
    } while (cursor !== null && pages.length < 20);
    return pages;
  };

  beforeAll(async () => {
    t = await startTestApp({
      REPLAY_RATE_LIMIT_PER_MINUTE: '1000',
      REPLAY_MAX_ACTIVE_SESSIONS: '20',
    });
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    for (const org of [ORG_A, ORG_B])
      await seedTemplates(
        new PostgresTemplateStore(db.db),
        org,
        findFixturesFolder(),
      );
    a = await t.bearer(['producer', 'developer'], ORG_A);
    b = await t.bearer(['producer', 'developer'], ORG_B);
    for (const templateId of [...TEMPLATES, ...TEMPLATES.slice(0, 2)])
      sessionsA.push(await start(templateId, a));
    sessionB = await start(TEMPLATES[0] ?? '', b);
  });

  afterAll(async () => {
    await db.close();
    await t.close();
  });

  it('pages sessions newest first with a stable order, a total and a last page', async () => {
    const pages = await walk<{ sessionId: string }>(
      '/replay-sessions?limit=2',
      a,
    );
    expect(pages.map((p) => p.items.length)).toEqual([2, 2, 1]);
    expect(pages.every((p) => p.total === 5)).toBe(true);
    expect(pages.at(-1)?.nextCursor).toBeNull();
    const ids = pages.flatMap((p) => p.items.map((s) => s.sessionId));
    expect(ids).toEqual([...sessionsA].reverse());

    const all = await page<{ sessionId: string }>('/replay-sessions', a);
    expect(all.items.map((s) => s.sessionId)).toEqual(ids);
    expect(all.nextCursor).toBeNull();
  });

  it('keeps pages stable when a newer session arrives mid-walk', async () => {
    const first = await page<{ sessionId: string }>(
      '/replay-sessions?limit=2',
      a,
    );
    const newest = await start(TEMPLATES[2] ?? '', a);
    sessionsA.push(newest);
    const second = await page<{ sessionId: string }>(
      `/replay-sessions?limit=2&cursor=${first.nextCursor}`,
      a,
    );
    const seen = [...first.items, ...second.items].map((s) => s.sessionId);
    expect(seen).not.toContain(newest);
    expect(new Set(seen).size).toBe(4);
    expect(second.total).toBe(6);
  });

  it('pages templates by id with the total', async () => {
    const pages = await walk<{ templateId: string }>(
      '/fixture-templates?limit=2',
      a,
    );
    expect(pages.map((p) => p.items.length)).toEqual([2, 2, 2]);
    expect(pages.every((p) => p.total === 6)).toBe(true);
    const ids = pages.flatMap((p) => p.items.map((i) => i.templateId));
    expect(ids).toEqual([...ids].sort());

    const unpaged = await page<{ templateId: string }>('/fixture-templates', a);
    expect(unpaged.items.map((i) => i.templateId)).toEqual(ids);
    expect(unpaged.nextCursor).toBeNull();
  });

  it('pages fixtures in kickoff order without a total', async () => {
    const pages = await walk<{ fixtureId: string }>('/fixtures?limit=4', a);
    const ids = pages.flatMap((p) => p.items.map((f) => f.fixtureId));
    expect(ids).toHaveLength(new Set(ids).size);
    expect(ids).toEqual(expect.arrayContaining(sessionsA));
    expect(pages[0]?.total).toBeUndefined();
    expect(pages.at(-1)?.nextCursor).toBeNull();
  });

  it('never shows another organisation’s rows, even with its cursor', async () => {
    const listB = await page<{ sessionId: string }>(
      '/replay-sessions?limit=1',
      b,
    );
    expect(listB.items.map((s) => s.sessionId)).toEqual([sessionB]);
    expect(listB.total).toBe(1);

    const first = await page<{ sessionId: string }>(
      '/replay-sessions?limit=1',
      a,
    );
    const replayed = await page<{ sessionId: string }>(
      `/replay-sessions?limit=10&cursor=${first.nextCursor}`,
      b,
    );
    expect(replayed.items.map((s) => s.sessionId)).not.toContain(
      sessionsA.at(-2),
    );
    expect(replayed.items.every((s) => s.sessionId === sessionB)).toBe(true);
  });

  it.each([
    ['/replay-sessions', 'not-a-cursor'],
    ['/replay-sessions', encodeCursor('s', ['yesterday', 'fx_comeback_42'])],
    ['/fixture-templates', encodeCursor('s', ['fx_comeback_42'])],
    ['/fixtures', encodeCursor('t', ['fx_comeback_42'])],
    ['/fixtures', Buffer.from('{"a":1}').toString('base64url')],
  ])(
    'answers 400 invalid-cursor for a bad cursor on %s',
    async (path, cursor) => {
      const res = await fetch(`${t.baseUrl}${path}?cursor=${cursor}`, {
        headers: a,
      });
      expect(res.status).toBe(400);
      expect((await jsonOf(res)).type).toBe(
        'urn:matchiq:problem:invalid-cursor',
      );
    },
  );

  it('validates limit bounds', async () => {
    for (const path of ['/replay-sessions', '/fixture-templates', '/fixtures'])
      expect(
        (await fetch(`${t.baseUrl}${path}?limit=101`, { headers: a })).status,
      ).toBe(422);
  });
});
