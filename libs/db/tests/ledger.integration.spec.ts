import type { StreamMessage } from '@matchiq/contracts';
import { Redis } from 'ioredis';
import {
  createDatabase,
  PostgresOutboxStore,
  PostgresStreamHistory,
  PostgresUnitOfWork,
  RedisStreamBus,
  sha256Hex,
  type DatabaseHandle,
  type FixtureKey,
  type StreamMessageDraft,
} from '../src/index.js';
import {
  buildTestEvent,
  buildTestFixture,
  createTestDatabase,
  testRedisUrl,
  uniqueTestToken,
  type TestDatabase,
} from '../src/testing/index.js';

const key: FixtureKey = { orgId: 'org_demo', fixtureId: 'fx_ledger' };

const draft = (sequence: number): StreamMessageDraft => ({
  schemaVersion: 1,
  fixtureId: key.fixtureId,
  emittedAt: '2026-10-20T19:31:00.000Z',
  type: 'match.event',
  payload: buildTestEvent(key.fixtureId, sequence),
});

describe('Postgres ledger (integration)', () => {
  let database: TestDatabase;
  let handle: DatabaseHandle;
  let uow: PostgresUnitOfWork;
  let history: PostgresStreamHistory;

  beforeAll(async () => {
    database = await createTestDatabase();
    handle = createDatabase({ url: database.url });
    uow = new PostgresUnitOfWork(handle.db);
    history = new PostgresStreamHistory(handle.db);
    const fixture = buildTestFixture(key.fixtureId);
    await uow.transaction((tx) =>
      tx.insertFixture(key.orgId, fixture, sha256Hex(fixture)),
    );
  });

  afterAll(async () => {
    await handle.close();
    await database.drop();
  });

  it('allocates contiguous stream sequences across transactions', async () => {
    const first = await uow.transaction((tx) =>
      tx.appendStreamMessages(key, [draft(0), draft(1)]),
    );
    const second = await uow.transaction((tx) =>
      tx.appendStreamMessages(key, [draft(2)]),
    );
    expect([...first, ...second].map((m) => m.streamSequence)).toEqual([
      1, 2, 3,
    ]);
    expect(await history.head(key)).toBe(3);
  });

  it('serialises concurrent appenders without gaps or duplicates', async () => {
    const before = (await history.head(key)) ?? 0;
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        uow.transaction((tx) => tx.appendStreamMessages(key, [draft(10 + i)])),
      ),
    );
    const rows = await history.read(key, { after: before, limit: 100 });
    expect(rows.map((m) => m.streamSequence)).toEqual(
      Array.from({ length: 8 }, (_, i) => before + i + 1),
    );
  });

  it('rolls back outbox rows and the head with the business write', async () => {
    const before = await history.head(key);
    await expect(
      uow.transaction(async (tx) => {
        await tx.appendStreamMessages(key, [draft(99)]);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(await history.head(key)).toBe(before);
  });

  it('rejects messages that violate the stream contract', async () => {
    const invalid = { ...draft(1), type: 'match.event', payload: {} };
    await expect(
      uow.transaction((tx) =>
        tx.appendStreamMessages(key, [invalid as StreamMessageDraft]),
      ),
    ).rejects.toThrow();
  });

  it('replays an idempotent response and flags a changed request', async () => {
    const request = {
      orgId: key.orgId,
      scope: 'test',
      key: 'k-1',
      requestHash: sha256Hex({ a: 1 }),
    };
    await uow.transaction(async (tx) => {
      expect(await tx.claimIdempotencyKey(request)).toEqual({
        kind: 'claimed',
      });
      await tx.completeIdempotencyKey(request, {
        status: 202,
        body: { ok: 1 },
      });
    });
    const replay = await uow.transaction((tx) =>
      tx.claimIdempotencyKey(request),
    );
    expect(replay).toEqual({
      kind: 'replay',
      response: { status: 202, body: { ok: 1 } },
    });
    const changed = await uow.transaction((tx) =>
      tx.claimIdempotencyKey({ ...request, requestHash: sha256Hex({ a: 2 }) }),
    );
    expect(changed).toEqual({ kind: 'mismatch' });
  });

  describe('outbox drain through Redis', () => {
    let publisher: Redis;
    let subscriber: Redis;
    let bus: RedisStreamBus;
    const store = () => new PostgresOutboxStore(handle.db);

    beforeAll(() => {
      publisher = new Redis(testRedisUrl());
      subscriber = new Redis(testRedisUrl());
      bus = new RedisStreamBus({
        publisher,
        subscriber,
        keyPrefix: `test${uniqueTestToken()}`,
      });
    });

    afterAll(async () => {
      publisher.disconnect();
      subscriber.disconnect();
    });

    it('publishes every unpublished row once, in order, and marks it', async () => {
      const received: StreamMessage[] = [];
      const unsubscribe = await bus.subscribe(key, (m) => received.push(m));
      const pending = (await history.head(key)) ?? 0;
      await store().drain(1_000, (r) => bus.publish(r.key, r.message));
      await expect.poll(() => received.length).toBe(pending);
      expect(received.map((m) => m.streamSequence)).toEqual(
        [...received.map((m) => m.streamSequence)].sort((a, b) => a - b),
      );
      expect(await store().drain(1_000, async () => undefined)).toBe(0);
      await unsubscribe();
    });

    it('keeps rows after a failed publish and delivers them on retry', async () => {
      await uow.transaction((tx) =>
        tx.appendStreamMessages(key, [draft(50), draft(51)]),
      );
      let calls = 0;
      await expect(
        store().drain(10, async (r) => {
          calls += 1;
          if (calls === 2) throw new Error('broker down');
          await bus.publish(r.key, r.message);
        }),
      ).rejects.toThrow('broker down');
      const retried: number[] = [];
      await store().drain(10, async (r) => {
        retried.push(r.message.streamSequence);
      });
      expect(retried).toHaveLength(1);
    });
  });
});
