import { RETENTION, type FixtureKey } from '@matchiq/db';
import {
  replayToEnd,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';

const DEPENDENT_TABLES = [
  'match_events',
  'stream_messages',
  'insights',
  'narratives',
  'overlay_cues',
  'agent_runs',
  'match_snapshots',
  'match_recaps',
  'replay_sessions',
  'fixtures',
] as const;

type Counts = Record<(typeof DEPENDENT_TABLES)[number], number>;

describe('data retention (integration)', () => {
  let t: TestWorker;
  let expired: FixtureKey;
  let recent: FixtureKey;
  let before: Counts;

  const count = async (sql: string, params: unknown[] = []) =>
    (await t.db.pool.query<{ n: number }>(sql, params)).rows[0]?.n ?? 0;

  const rowsFor = async (key: FixtureKey): Promise<Counts> => {
    const counts = {} as Counts;
    for (const table of DEPENDENT_TABLES) {
      counts[table] = await count(
        `select count(*)::int as n from ${table} where org_id = $1 and fixture_id = $2`,
        [key.orgId, key.fixtureId],
      );
    }
    return counts;
  };

  const auditCount = (action: string) =>
    count('select count(*)::int as n from audit_events where action = $1', [
      action,
    ]);

  beforeAll(async () => {
    t = await startTestWorker({ env: { RETENTION_ENABLED: 'false' } });
    expired = await replayToEnd(t, TEMPLATE);
    recent = await replayToEnd(t, TEMPLATE);
    await t.db.pool.query(
      `update replay_sessions set updated_at = now() - interval '8 days'
       where fixture_id = $1`,
      [expired.fixtureId],
    );
    await t.db.pool.query(
      `insert into idempotency_keys (org_id, scope, key, request_hash, created_at)
       values ('org_demo', 's', 'old', repeat('a', 64), now() - interval '2 days'),
              ('org_demo', 's', 'new', repeat('b', 64), now())`,
    );
    before = await rowsFor(expired);
  });

  afterAll(() => t.close());

  it('deletes an expired session with every dependent row, keeping templates, audit and recent data', async () => {
    expect(before.match_events).toBeGreaterThan(1_000);
    expect(before.narratives).toBeGreaterThan(0);
    const recentBefore = await rowsFor(recent);
    const sessionAudit = await auditCount('replay.session.created');

    const report = await t.retention.run();

    expect(report?.removed).toEqual({
      sessions: 1,
      fixtures: 1,
      events: before.match_events,
      streamMessages: before.stream_messages,
      insights: before.insights,
      narratives: before.narratives,
      overlays: before.overlay_cues,
      agentRuns: before.agent_runs,
      snapshots: before.match_snapshots,
      recaps: before.match_recaps,
    });
    expect(report?.idempotencyKeys).toBe(1);
    expect(Object.values(await rowsFor(expired))).toEqual(
      DEPENDENT_TABLES.map(() => 0),
    );
    expect(await rowsFor(recent)).toEqual(recentBefore);
    expect(
      await count('select count(*)::int as n from fixture_templates'),
    ).toBe(6);
    expect(
      await count(
        `select count(*)::int as n from idempotency_keys where key = 'new'`,
      ),
    ).toBe(1);
    expect(await auditCount('replay.session.created')).toBe(sessionAudit);
    expect(await auditCount('retention.sessions.purged')).toBe(1);
    expect(await auditCount('retention.run')).toBe(1);
  });

  it('is a no-op once nothing has expired, and writes no audit', async () => {
    const report = await t.retention.run();
    expect(report?.removed.sessions).toBe(0);
    expect(report?.idempotencyKeys).toBe(0);
    expect(await auditCount('retention.run')).toBe(1);
  });

  it('skips the run while another replica holds the retention lock', async () => {
    const holder = await t.db.pool.connect();
    try {
      await holder.query('select pg_advisory_lock(hashtextextended($1, 0))', [
        RETENTION.advisoryLockName,
      ]);
      expect(await t.retention.run()).toBeNull();
    } finally {
      await holder.query('select pg_advisory_unlock_all()');
      holder.release();
    }
    expect(await t.retention.run()).not.toBeNull();
  });
});
