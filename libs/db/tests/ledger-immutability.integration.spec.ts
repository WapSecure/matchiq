import { sql } from 'drizzle-orm';
import pg from 'pg';
import {
  appendReplayedEvents,
  createDatabase,
  PostgresPipelineUnitOfWork,
  PostgresRetentionStore,
  PostgresUnitOfWork,
  REPLAY_INGESTION_PREFIX,
  sha256Hex,
  withTenant,
  type DatabaseHandle,
  type FixtureKey,
} from '../src/index.js';
import {
  buildTestEvent,
  buildTestFixture,
  createTestDatabase,
  type TestDatabase,
} from '../src/testing/index.js';

const INSUFFICIENT_PRIVILEGE = '42501';
const kept: FixtureKey = { orgId: 'org_demo', fixtureId: 'fx_kept' };
const purged: FixtureKey = { orgId: 'org_demo', fixtureId: 'fx_purged' };

const errorCode = async (work: () => Promise<unknown>): Promise<string> => {
  try {
    await work();
    return 'none';
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return (error as { code?: string }).code ?? cause?.code ?? 'unknown';
  }
};

describe('match_events ledger immutability (integration)', () => {
  let database: TestDatabase;
  let handle: DatabaseHandle;
  let owner: pg.Pool;

  const eventCount = async (key: FixtureKey) =>
    (
      await owner.query<{ n: number }>(
        'select count(*)::int as n from match_events where org_id = $1 and fixture_id = $2',
        [key.orgId, key.fixtureId],
      )
    ).rows[0]?.n;

  beforeAll(async () => {
    database = await createTestDatabase();
    handle = createDatabase({ url: database.url });
    owner = new pg.Pool({ connectionString: database.url, max: 1 });
    const uow = new PostgresUnitOfWork(handle.db);
    const pipeline = new PostgresPipelineUnitOfWork(handle.db);
    for (const key of [kept, purged]) {
      const fixture = buildTestFixture(key.fixtureId);
      await uow.transaction((tx) =>
        tx.insertFixture(key.orgId, fixture, sha256Hex(fixture)),
      );
      await pipeline.transaction((tx) =>
        appendReplayedEvents(
          tx,
          key,
          `${REPLAY_INGESTION_PREFIX}${key.fixtureId}`,
          [0, 1, 2].map((s) => buildTestEvent(key.fixtureId, s)),
        ),
      );
    }
  });

  afterAll(async () => {
    await owner.end();
    await handle.close();
    await database.drop();
  });

  it('refuses UPDATE and DELETE for the app role', async () => {
    for (const statement of [
      sql`update match_events set period = 2`,
      sql`delete from match_events`,
    ]) {
      const code = await errorCode(() =>
        withTenant(handle.db, kept.orgId, (tx) => tx.execute(statement)),
      );
      expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    }
    expect(await eventCount(kept)).toBe(3);
  });

  it('refuses UPDATE and a direct DELETE even for the owner', async () => {
    for (const statement of [
      `update match_events set period = 2 where fixture_id = 'fx_kept'`,
      `delete from match_events where fixture_id = 'fx_kept'`,
    ]) {
      const code = await errorCode(() => owner.query(statement));
      expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    }
    expect(await eventCount(kept)).toBe(3);
  });

  it('does not let the app role call the purge function', async () => {
    const code = await errorCode(() =>
      withTenant(handle.db, kept.orgId, (tx) =>
        tx.execute(
          sql`select purge_match_ledger(array['org_demo'], array['fx_kept'])`,
        ),
      ),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
    expect(await eventCount(kept)).toBe(3);
  });

  it('still lets retention delete a whole expired ledger', async () => {
    const counts = await new PostgresRetentionStore(handle).deleteSessions([
      purged,
    ]);
    expect(counts.events).toBe(3);
    expect(counts.fixtures).toBe(1);
    expect(await eventCount(purged)).toBe(0);
    expect(await eventCount(kept)).toBe(3);
    const code = await errorCode(() =>
      owner.query(`delete from match_events where fixture_id = 'fx_kept'`),
    );
    expect(code).toBe(INSUFFICIENT_PRIVILEGE);
  });
});
