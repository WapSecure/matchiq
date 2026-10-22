import type { ReplayCommand } from '@matchiq/contracts';
import { PostgresEventReader, type FixtureKey } from '@matchiq/db';
import {
  ORG,
  readStream,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';
const IDLE_MS = 5_000;

const create = async (t: TestWorker): Promise<FixtureKey> => {
  const created = await t.store.create({
    orgId: ORG,
    templateId: TEMPLATE,
    speed: 30,
  });
  if (created === null) throw new Error('no session');
  return { orgId: ORG, fixtureId: created.fixture.fixtureId };
};

const send = async (
  t: TestWorker,
  key: FixtureKey,
  command: ReplayCommand,
): Promise<void> => {
  await t.sessions.handle({ ...key, command });
  await t.sessions.whenIdle(key.fixtureId);
};

const START: ReplayCommand = { action: 'start', speed: 30 };

const stateOf = async (t: TestWorker, key: FixtureKey) =>
  (await t.store.get(key))?.status.state;

const rejections = async (t: TestWorker, key: FixtureKey) =>
  (
    await t.db.pool.query<{ details: Record<string, unknown> }>(
      `select details from audit_events
       where action = 'replay.command.rejected' and target_id = $1`,
      [key.fixtureId],
    )
  ).rows.map((r) => r.details);

const boot = (database?: TestWorker['database'], max = '2') =>
  startTestWorker({
    env: {
      REPLAY_MAX_ACTIVE_SESSIONS: max,
      REPLAY_IDLE_TIMEOUT_MS: String(IDLE_MS),
      RETENTION_ENABLED: 'false',
    },
    ...(database ? { database } : {}),
  });

describe('replay session capacity (integration)', () => {
  let t: TestWorker;

  beforeEach(async () => {
    t = await boot();
  });

  afterEach(() => t.close());

  it('lets a new session start once abandoned ones are paused, and evicts them after the idle timeout', async () => {
    const abandoned = [await create(t), await create(t)];
    for (const key of abandoned) {
      await send(t, key, START);
      t.scheduler.advance(2_000);
      await send(t, key, { action: 'pause' });
    }
    const third = await create(t);
    await send(t, third, START);
    expect(await stateOf(t, third)).toBe('PLAYING');

    t.scheduler.advance(IDLE_MS);
    expect(t.sessions.evictIdle()).toBe(2);
    expect(t.sessions.isLoaded(third.fixtureId)).toBe(true);

    const [first] = abandoned;
    if (!first) throw new Error('no session');
    const pausedAt = (await t.store.get(first))?.status.appliedSequence ?? -1;
    await send(t, third, { action: 'pause' });
    await send(t, first, { action: 'resume' });
    expect(await t.store.get(first)).toMatchObject({
      status: { state: 'PLAYING', speed: 30 },
    });
    t.scheduler.runAll();
    await t.sessions.whenIdle(first.fixtureId);
    const ledger = await new PostgresEventReader(t.db.db).listAfter(
      first,
      -1,
      5_000,
    );
    expect(ledger.map((e) => e.sequence)).toEqual(ledger.map((_, i) => i));
    expect(ledger.length - 1).toBeGreaterThan(pausedAt);
    expect(await stateOf(t, first)).toBe('COMPLETED');
  });

  it('refuses a start at capacity with an audited status message instead of dropping it', async () => {
    const [a, b, c] = [await create(t), await create(t), await create(t)];
    await send(t, a, START);
    await send(t, b, START);
    await send(t, c, START);

    expect(await stateOf(t, c)).toBe('IDLE');
    const statuses = (await readStream(t, c))
      .filter((m) => m.type === 'replay.status')
      .map((m) => m.type === 'replay.status' && m.payload.state);
    expect(statuses).toEqual(['IDLE', 'IDLE']);
    expect(await rejections(t, c)).toEqual([
      {
        reason: 'replay-capacity',
        command: START,
        active: 2,
        max: 2,
      },
    ]);
    expect(await new PostgresEventReader(t.db.db).listAfter(c, -1, 10)).toEqual(
      [],
    );

    await send(t, a, { action: 'pause' });
    await send(t, c, START);
    expect(await stateOf(t, c)).toBe('PLAYING');
  });

  it('counts a loaded session that never starts only until the idle timeout', async () => {
    const [a, b, c] = [await create(t), await create(t), await create(t)];
    await send(t, a, START);
    await send(t, b, { action: 'setSpeed', speed: 5 });
    await send(t, c, START);
    expect(await stateOf(t, c)).toBe('IDLE');

    t.scheduler.advance(IDLE_MS);
    expect(t.sessions.evictIdle()).toBe(2);
    await send(t, c, START);
    expect(await stateOf(t, c)).toBe('PLAYING');
  });

  it('resumes only up to the limit after a restart and never reloads paused sessions', async () => {
    const [a, b, c] = [await create(t), await create(t), await create(t)];
    await send(t, a, START);
    await send(t, b, START);
    await send(t, b, { action: 'pause' });
    await send(t, c, START);
    t.scheduler.advance(1_000);
    await t.sessions.whenIdle(a.fixtureId);
    await t.sessions.whenIdle(c.fixtureId);

    const restarted = await boot(t.database, '1');
    try {
      const states = await Promise.all(
        [a, b, c].map(async (key) => {
          await restarted.sessions.whenIdle(key.fixtureId);
          return stateOf(restarted, key);
        }),
      );
      expect(states.filter((s) => s === 'PLAYING')).toHaveLength(1);
      expect(states[1]).toBe('PAUSED');
      expect(restarted.sessions.isLoaded(b.fixtureId)).toBe(false);
      expect(
        await restarted.store.countActive({ orgId: ORG, idleMs: IDLE_MS }),
      ).toBe(1);
    } finally {
      await restarted.close({ keepDatabase: true });
    }
  });
});
