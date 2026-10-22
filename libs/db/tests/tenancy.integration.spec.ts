import { sql } from 'drizzle-orm';
import pg from 'pg';
import {
  createDatabase,
  CrossTenantError,
  PostgresFixtureReader,
  PostgresIntelligenceReader,
  PostgresSessionStore,
  PostgresUnitOfWork,
  sha256Hex,
  TENANCY,
  withTenant,
  type DatabaseHandle,
} from '../src/index.js';
import {
  buildTestFixture,
  createTestDatabase,
  type TestDatabase,
} from '../src/testing/index.js';

const ORG_A = 'org_alpha';
const ORG_B = 'org_bravo';
const RLS_VIOLATION = '42501';

/** Tables the owner role reaches without RLS, by design (none hold tenant rows). */
const coverageSql = `
  select c.relname as name,
         c.relrowsecurity as rls,
         exists (select 1 from pg_policy p where p.polrelid = c.oid) as policy,
         exists (select 1 from pg_attribute a
                 where a.attrelid = c.oid and a.attname = 'org_id' and not a.attisdropped) as tenant,
         has_table_privilege($1, c.oid, 'SELECT') as app_select
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  order by c.relname`;

interface Coverage {
  name: string;
  rls: boolean;
  policy: boolean;
  tenant: boolean;
  app_select: boolean;
}

const errorCode = async (work: () => Promise<unknown>): Promise<string> => {
  try {
    await work();
    return 'none';
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return (error as { code?: string }).code ?? cause?.code ?? 'unknown';
  }
};

describe('tenant isolation in Postgres (integration)', () => {
  let database: TestDatabase;
  let handle: DatabaseHandle;
  let admin: pg.Pool;
  const uow = () => new PostgresUnitOfWork(handle.db);

  beforeAll(async () => {
    database = await createTestDatabase();
    handle = createDatabase({ url: database.url });
    admin = new pg.Pool({ connectionString: database.url, max: 1 });
    for (const [org, fixtureId] of [
      [ORG_A, 'fx_alpha'],
      [ORG_B, 'fx_bravo'],
      [ORG_B, 'fx_shared'],
      [ORG_A, 'fx_shared'],
    ] as const) {
      const fixture = buildTestFixture(fixtureId);
      await uow().transaction((tx) =>
        tx.insertFixture(org, fixture, sha256Hex(fixture)),
      );
    }
  });

  afterAll(async () => {
    await admin.end();
    await handle.close();
    await database.drop();
  });

  it('enables RLS with a policy on every table that has org_id, and grants the app role nothing else', async () => {
    const { rows } = await admin.query<Coverage>(coverageSql, [
      TENANCY.appRole,
    ]);
    const tenantTables = rows.filter((r) => r.tenant);
    expect(tenantTables.length).toBeGreaterThanOrEqual(13);
    for (const table of tenantTables) {
      expect({
        table: table.name,
        rls: table.rls,
        policy: table.policy,
      }).toEqual({
        table: table.name,
        rls: true,
        policy: true,
      });
    }
    expect(rows.filter((r) => !r.tenant && r.app_select)).toEqual([]);
  });

  it('shows a tenant only its own rows, even without a WHERE clause', async () => {
    const names = await withTenant(handle.db, ORG_A, async (tx) => {
      const result = await tx.execute<{ fixture_id: string; org_id: string }>(
        sql`select org_id, fixture_id from fixtures order by fixture_id`,
      );
      return result.rows;
    });
    expect(names).toEqual([
      { org_id: ORG_A, fixture_id: 'fx_alpha' },
      { org_id: ORG_A, fixture_id: 'fx_shared' },
    ]);
  });

  it('fails closed when the role is switched but no organisation is set', async () => {
    const count = await handle.db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('role', ${TENANCY.appRole}, true)`,
      );
      const result = await tx.execute<{ n: number }>(
        sql`select count(*)::int as n from fixtures`,
      );
      return result.rows[0]?.n;
    });
    expect(count).toBe(0);
  });

  it('rejects writing a row for another organisation', async () => {
    const code = await errorCode(() =>
      withTenant(handle.db, ORG_A, (tx) =>
        tx.execute(
          sql`update fixtures set title = 'hijacked' where org_id = ${ORG_B}`,
        ),
      ),
    );
    expect(code).toBe('none');
    const { rows } = await admin.query<{ title: string }>(
      `select title from fixtures where org_id = $1 and fixture_id = 'fx_bravo'`,
      [ORG_B],
    );
    expect(rows[0]?.title).not.toBe('hijacked');
    const insert = await errorCode(() =>
      withTenant(handle.db, ORG_A, (tx) =>
        tx.execute(
          sql`insert into audit_events (org_id, actor, action, target_type, target_id, details)
              values (${ORG_B}, 'x', 'test.action', 'fixture', 'fx_bravo', '{}')`,
        ),
      ),
    );
    expect(insert).toBe(RLS_VIOLATION);
  });

  it('keeps audit_events append-only for the app role', async () => {
    await uow().transaction((tx) =>
      tx.appendAudit({
        orgId: ORG_A,
        actor: 'user-1',
        action: 'test.recorded',
        targetType: 'fixture',
        targetId: 'fx_alpha',
        details: {},
      }),
    );
    for (const statement of [
      sql`update audit_events set actor = 'someone-else'`,
      sql`delete from audit_events`,
    ]) {
      const code = await errorCode(() =>
        withTenant(handle.db, ORG_A, (tx) => tx.execute(statement)),
      );
      expect(code).toBe(RLS_VIOLATION);
    }
  });

  it('refuses a unit of work that touches two organisations and rolls it back', async () => {
    const fixture = buildTestFixture('fx_mixed');
    await expect(
      uow().transaction(async (tx) => {
        await tx.insertFixture(ORG_A, fixture, sha256Hex(fixture));
        await tx.insertFixture(ORG_B, fixture, sha256Hex(fixture));
      }),
    ).rejects.toBeInstanceOf(CrossTenantError);
    const { rows } = await admin.query(
      `select 1 from fixtures where fixture_id = 'fx_mixed'`,
    );
    expect(rows).toHaveLength(0);
  });

  it('answers a guessed cross-tenant id with nothing through every reader', async () => {
    const fixtures = new PostgresFixtureReader(handle.db);
    const reader = new PostgresIntelligenceReader(handle.db);
    const sessions = new PostgresSessionStore(handle.db);
    const foreign = { orgId: ORG_A, fixtureId: 'fx_bravo' };
    expect(await fixtures.get(foreign)).toBeNull();
    expect(
      await fixtures.get({ orgId: ORG_B, fixtureId: 'fx_bravo' }),
    ).not.toBeNull();
    expect(
      (await fixtures.list(ORG_A, 10)).map((f) => f.fixtureId).sort(),
    ).toEqual(['fx_alpha', 'fx_shared']);
    expect(await reader.insights(foreign)).toEqual([]);
    expect(await reader.overlays(foreign)).toEqual([]);
    expect(await sessions.get(foreign)).toBeNull();
  });
});
