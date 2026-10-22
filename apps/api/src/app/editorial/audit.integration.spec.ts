import { AuditEventPage } from '@matchiq/contracts';
import { buildTestFixture } from '@matchiq/db/testing';
import {
  AUTH_HEADER,
  createFixture,
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(30_000);

const FIXTURES = ['fx_audit_a', 'fx_audit_b', 'fx_audit_c', 'fx_audit_d'];
const REASON = { reason: 'Rehearsal of the freeze runbook' };

describe('Audit trail API (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
    for (const id of FIXTURES) await createFixture(t, buildTestFixture(id));
    await postJson(`${t.baseUrl}/fixtures/fx_audit_a/editorial/freeze`, REASON);
    await postJson(`${t.baseUrl}/fixtures/fx_audit_a/editorial/resume`, REASON);
  });

  afterAll(() => t.close());

  const list = async (query = ''): Promise<AuditEventPage> => {
    const res = await fetch(`${t.baseUrl}/audit-events${query}`, {
      headers: AUTH_HEADER,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    return AuditEventPage.parse(await res.json());
  };

  it('pages newest first with a keyset cursor and no gaps or repeats', async () => {
    const all = await list('?limit=200');
    expect(all.items).toHaveLength(6);
    expect(all.nextCursor).toBeNull();
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: AuditEventPage = await list(
        `?limit=4${cursor ? `&cursor=${cursor}` : ''}`,
      );
      seen.push(...page.items.map((e) => e.id));
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(seen).toEqual(all.items.map((e) => e.id));
    const times = all.items.map((e) => e.at);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('filters by action, target, fixture and actor type', async () => {
    const created = await list('?action=fixture.created');
    expect(created.items.map((e) => e.target.id).sort()).toEqual(FIXTURES);
    const one = await list('?targetType=fixture&targetId=fx_audit_b');
    expect(one.items).toHaveLength(1);
    const forA = await list('?fixtureId=fx_audit_a');
    expect(forA.items.map((e) => e.action)).toEqual([
      'editorial.resumed',
      'editorial.frozen',
      'fixture.created',
    ]);
    expect(forA.items[0]).toMatchObject({
      actor: { type: 'OPERATOR', id: 'operator-key' },
      reason: REASON.reason,
      before: { frozen: true },
      after: { frozen: false, mode: 'AUTO' },
    });
    expect((await list('?actorType=SYSTEM')).items).toEqual([]);
  });

  it('filters by a time window', async () => {
    const all = await list();
    const newest = all.items[0]?.at ?? '';
    const window = await list(`?from=${newest}&to=${newest}`);
    expect(window.items.length).toBeGreaterThanOrEqual(1);
    expect(window.items.every((e) => e.at === newest)).toBe(true);
    expect((await list('?to=2000-01-01T00:00:00Z')).items).toEqual([]);
  });

  it('rejects a forged cursor and inconsistent filters with problem details', async () => {
    const bad = await fetch(
      `${t.baseUrl}/audit-events?cursor=bm90LWEtY3Vyc29y`,
      {
        headers: AUTH_HEADER,
      },
    );
    expect(bad.status).toBe(400);
    expect((await jsonOf(bad)).type).toBe('urn:matchiq:problem:invalid-cursor');
    const orphan = await fetch(
      `${t.baseUrl}/audit-events?targetId=fx_audit_a`,
      {
        headers: AUTH_HEADER,
      },
    );
    expect(orphan.status).toBe(422);
    const range = await fetch(
      `${t.baseUrl}/audit-events?from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z`,
      { headers: AUTH_HEADER },
    );
    expect(range.status).toBe(422);
  });

  it('keeps the audit table append-only', async () => {
    await expect(
      t.sql.query("update audit_events set actor = 'x'"),
    ).rejects.toThrow(/append-only/);
    await expect(t.sql.query('delete from audit_events')).rejects.toThrow(
      /append-only/,
    );
  });
});
