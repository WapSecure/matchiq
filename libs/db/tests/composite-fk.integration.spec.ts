import pg from 'pg';
import {
  createDatabase,
  PostgresUnitOfWork,
  sha256Hex,
  type DatabaseHandle,
} from '../src/index.js';
import {
  buildTestFixture,
  createTestDatabase,
  type TestDatabase,
} from '../src/testing/index.js';

const FOREIGN_KEY_VIOLATION = '23503';
const ORG_A = 'org_alpha';
const ORG_B = 'org_bravo';
const HASH = 'a'.repeat(64);

const insertMessage = `
  insert into stream_messages (org_id, fixture_id, stream_sequence, type, message)
  values ($1, $2, 1, 'test', '{}'::jsonb)`;

const insertEvent = `
  insert into match_events
    (org_id, fixture_id, event_id, sequence, type, period, match_clock_ms,
     wall_clock_utc, schema_version, payload, payload_hash, ingestion_id)
  values ($1, $2, 'ev_orphan', 0, 'KICK_OFF', 1, 0, now(), 1, '{}'::jsonb, $3, 'ing_1')`;

const errorCode = async (work: () => Promise<unknown>): Promise<string> => {
  try {
    await work();
    return 'none';
  } catch (error) {
    return (error as { code?: string }).code ?? 'unknown';
  }
};

describe('composite tenant foreign keys (integration)', () => {
  let database: TestDatabase;
  let handle: DatabaseHandle;
  let owner: pg.Pool;

  beforeAll(async () => {
    database = await createTestDatabase();
    handle = createDatabase({ url: database.url });
    owner = new pg.Pool({ connectionString: database.url, max: 1 });
    const fixture = buildTestFixture('fx_bravo_only');
    await new PostgresUnitOfWork(handle.db).transaction((tx) =>
      tx.insertFixture(ORG_B, fixture, sha256Hex(fixture)),
    );
  });

  afterAll(async () => {
    await owner.end();
    await handle.close();
    await database.drop();
  });

  it('accepts a child row whose org_id and fixture_id match its fixture', async () => {
    const code = await errorCode(() =>
      owner.query(insertMessage, [ORG_B, 'fx_bravo_only']),
    );
    expect(code).toBe('none');
  });

  it('rejects a stream message carrying another organisation for the same fixture id', async () => {
    const code = await errorCode(() =>
      owner.query(insertMessage, [ORG_A, 'fx_bravo_only']),
    );
    expect(code).toBe(FOREIGN_KEY_VIOLATION);
  });

  it('rejects a ledger event with a mismatched org_id', async () => {
    const code = await errorCode(() =>
      owner.query(insertEvent, [ORG_A, 'fx_bravo_only', HASH]),
    );
    expect(code).toBe(FOREIGN_KEY_VIOLATION);
  });

  it('rejects a ledger event for a fixture that does not exist', async () => {
    const code = await errorCode(() =>
      owner.query(insertEvent, [ORG_B, 'fx_missing', HASH]),
    );
    expect(code).toBe(FOREIGN_KEY_VIOLATION);
  });
});
