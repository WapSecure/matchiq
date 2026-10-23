import {
  createDatabase,
  encodeCursor,
  findFixturesFolder,
  PostgresTemplateStore,
  seedTemplates,
} from '@matchiq/db';
import { seedMatch, type SeededMatch } from '../../test/match-paging-fixtures';
import {
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(40_000);

const ORG_A = 'org_demo';
const ORG_B = 'org_northbank';
const TEMPLATE = 'fx_comeback_42';

interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}
type Headers = Record<string, string>;

interface ListCase {
  readonly name: string;
  readonly path: string;
  readonly kind: string;
  /** Pulls the stable id out of one item. */
  readonly idOf: (item: never) => string;
  readonly expected: (m: SeededMatch) => string[];
  readonly total: number;
}

const CASES: readonly ListCase[] = [
  {
    name: 'insights',
    path: 'insights',
    kind: 'i',
    idOf: (i: { insightId: string }) => i.insightId,
    expected: (m) => m.insightIds,
    total: 9,
  },
  {
    name: 'narratives',
    path: 'narratives',
    kind: 'n',
    idOf: (i: { narrativeId: string }) => i.narrativeId,
    expected: (m) => m.narrativeIds,
    total: 12,
  },
  {
    name: 'overlays',
    path: 'overlays',
    kind: 'o',
    idOf: (i: { overlayId: string }) => i.overlayId,
    expected: (m) => m.overlayIds,
    total: 5,
  },
  {
    name: 'agent-runs',
    path: 'agent-runs',
    kind: 'r',
    idOf: (i: { insightId: string }) => i.insightId,
    expected: (m) => m.insightIds,
    total: 9,
  },
];

/** Keyset paging of the per-match lists (MQ-058). */
describe('per-match list paging (integration)', () => {
  let t: TestApp;
  let a: Headers;
  let b: Headers;
  let fixtureA = '';
  let otherA = '';
  let fixtureB = '';
  let seeded: SeededMatch;

  const start = async (headers: Headers) => {
    const res = await postJson(
      `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
      { speed: 30 },
      headers,
    );
    expect(res.status).toBe(201);
    return (await jsonOf<{ fixture: { fixtureId: string } }>(res)).fixture
      .fixtureId;
  };

  const url = (fixtureId: string, path: string, query = '') =>
    `${t.baseUrl}/fixtures/${fixtureId}/${path}${query}`;

  const read = async <T>(path: string, query = '', fixtureId = fixtureA) => {
    const res = await fetch(url(fixtureId, path, query), { headers: a });
    expect(res.status).toBe(200);
    return jsonOf<Page<T>>(res);
  };

  const walk = async (c: ListCase, limit: number, extra = '') => {
    const pages: Page<never>[] = [];
    let cursor: string | null = null;
    do {
      const query = `?limit=${limit}${extra}${cursor ? `&cursor=${cursor}` : ''}`;
      const next: Page<never> = await read<never>(c.path, query);
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
    a = await t.bearer(['producer', 'developer'], ORG_A);
    b = await t.bearer(['producer', 'developer'], ORG_B);
    const db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    for (const org of [ORG_A, ORG_B])
      await seedTemplates(
        new PostgresTemplateStore(db.db),
        org,
        findFixturesFolder(),
      );
    await db.close();
    fixtureA = await start(a);
    otherA = await start(a);
    fixtureB = await start(b);
    seeded = await seedMatch(t, ORG_A, fixtureA);
    await seedMatch(t, ORG_A, otherA);
    await seedMatch(t, ORG_B, fixtureB, 'orgb-');
  });

  afterAll(async () => {
    await t.close();
  });

  describe.each(CASES)('$name', (c) => {
    it('pages in a stable order with the total and a last page', async () => {
      const pages = await walk(c, 4);
      const ids = pages.flatMap((p) => p.items.map((i) => c.idOf(i)));
      expect(ids).toEqual(c.expected(seeded));
      expect(pages.every((p) => p.total === c.total)).toBe(true);
      expect(pages.at(-1)?.nextCursor).toBeNull();
      expect(pages.slice(0, -1).every((p) => p.nextCursor !== null)).toBe(true);
      expect(pages.map((p) => p.items.length)).toEqual(
        expect.arrayContaining([4]),
      );
    });

    it('returns the whole list by default, exactly as before', async () => {
      const all = await read<never>(c.path);
      expect(all.items.map((i) => c.idOf(i))).toEqual(c.expected(seeded));
      expect(all.nextCursor).toBeNull();
      expect(all.total).toBe(c.total);
    });

    it('answers an empty last page with no cursor', async () => {
      const exact = await read<never>(c.path, `?limit=${c.total}`);
      expect(exact.items).toHaveLength(c.total);
      expect(exact.nextCursor).toBeNull();
    });

    it('validates the limit bounds', async () => {
      for (const limit of ['0', '501', 'x']) {
        const res = await fetch(url(fixtureA, c.path, `?limit=${limit}`), {
          headers: a,
        });
        expect(res.status).toBe(422);
      }
      expect((await read<never>(c.path, '?limit=500')).items).toHaveLength(
        c.total,
      );
    });

    it('rejects a tampered or foreign cursor with 400 invalid-cursor', async () => {
      const other = CASES.find((x) => x.kind !== c.kind)?.kind ?? 'x';
      const bad = [
        'not-a-cursor',
        Buffer.from('{"a":1}').toString('base64url'),
        encodeCursor(other as 's', [fixtureA, '1', 'x']),
        encodeCursor(c.kind as 's', [fixtureA, 'one', 'x']),
        encodeCursor(c.kind as 's', [fixtureA, '1']),
        // A cursor taken from another match is refused, not misapplied.
        encodeCursor(c.kind as 's', [otherA, '1', 'x']),
      ];
      for (const cursor of bad) {
        const res = await fetch(url(fixtureA, c.path, `?cursor=${cursor}`), {
          headers: a,
        });
        expect(res.status).toBe(400);
        expect((await jsonOf(res)).type).toBe(
          'urn:matchiq:problem:invalid-cursor',
        );
      }
    });

    it('stays inside the caller’s organisation', async () => {
      const first = await read<never>(c.path, '?limit=2');
      const cursor = `?limit=500&cursor=${first.nextCursor}`;
      // Session fixture ids repeat per organisation: B reads only its own rows.
      expect(fixtureB).toBe(fixtureA);
      const replayed = await fetch(url(fixtureA, c.path, cursor), {
        headers: b,
      });
      expect(replayed.status).toBe(200);
      const body = await jsonOf<Page<never>>(replayed);
      const seen = body.items.map((i) => c.idOf(i));
      expect(seen.length).toBeGreaterThan(0);
      expect(seen.every((id) => id.includes('orgb-'))).toBe(true);
      expect(body.total).toBe(c.total);
      // A match only organisation A has answers 404 to B, with or without a cursor.
      for (const query of ['', cursor]) {
        const res = await fetch(url(otherA, c.path, query), { headers: b });
        expect(res.status).toBe(404);
      }
    });
  });

  it('keeps narrative filters through every page, with a filtered total', async () => {
    const c = CASES[1] as ListCase;
    const pages = await walk(c, 2, '&persona=CASUAL');
    const ids = pages.flatMap((p) => p.items.map((i) => c.idOf(i)));
    expect(ids).toEqual(seeded.casualNarrativeIds);
    expect(pages.every((p) => p.total === 6)).toBe(true);

    const french = await read<{ locale: string }>(
      'narratives',
      '?locale=fr-FR&limit=3',
    );
    expect(french.total).toBe(6);
    expect(french.items.every((n) => n.locale === 'fr-FR')).toBe(true);
    expect(french.nextCursor).not.toBeNull();
  });

  it('hides cues that never aired from the overlay list and its total', async () => {
    const all = await read<{ overlayId: string }>('overlays');
    expect(all.items.map((o) => o.overlayId)).not.toContain('ov_6');
    expect(all.total).toBe(5);
  });

  it('loads each trace page with only its own agent runs, one trace per insight', async () => {
    const pages = await walk(CASES[3] as ListCase, 4);
    const traces = pages.flatMap((p) => p.items as unknown as Trace[]);
    expect(traces.map((x) => x.insightId)).toEqual(seeded.insightIds);
    expect(traces.map((x) => x.runs.length)).toEqual([
      0, 0, 0, 0, 0, 0, 2, 2, 2,
    ]);
    expect(pages.map((p) => p.items.length)).toEqual([4, 4, 1]);
  });
});

interface Trace {
  insightId: string;
  runs: unknown[];
}
