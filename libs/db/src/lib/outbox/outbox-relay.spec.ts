import type { StreamMessage } from '@matchiq/contracts';
import type { OutboxRecord, OutboxStore, StreamPublisher } from '../ports.js';
import { OutboxRelay } from './outbox-relay.js';

const record = (streamSequence: number): OutboxRecord => ({
  key: { orgId: 'org_demo', fixtureId: 'fx_a' },
  message: {
    schemaVersion: 1,
    streamSequence,
    fixtureId: 'fx_a',
    emittedAt: '2026-10-20T19:31:00Z',
    type: 'heartbeat',
    payload: {},
  } satisfies StreamMessage,
});

class FakeStore implements OutboxStore {
  pending: OutboxRecord[] = [];
  drains = 0;

  async drain(
    limit: number,
    publish: (r: OutboxRecord) => Promise<void>,
  ): Promise<number> {
    this.drains += 1;
    const batch = this.pending.slice(0, limit);
    let done = 0;
    for (const r of batch) {
      await publish(r);
      done += 1;
    }
    this.pending = this.pending.slice(done);
    return done;
  }
}

const recorder = (): StreamPublisher & { seen: number[] } => {
  const seen: number[] = [];
  return {
    seen,
    publish: async (_key, message) => {
      seen.push(message.streamSequence);
    },
  };
};

const waitFor = async (condition: () => boolean): Promise<void> => {
  for (let i = 0; i < 200 && !condition(); i += 1) {
    await new Promise((r) => setTimeout(r, 5));
  }
  expect(condition()).toBe(true);
};

describe('OutboxRelay', () => {
  it('drains the whole backlog in stream order across batches', async () => {
    const store = new FakeStore();
    store.pending = [1, 2, 3, 4, 5].map(record);
    const publisher = recorder();
    const relay = new OutboxRelay({
      store,
      publisher,
      batchSize: 2,
      pollIntervalMs: 10_000,
      onError: () => undefined,
    });
    relay.start();
    await waitFor(() => publisher.seen.length === 5);
    await relay.stop();
    expect(publisher.seen).toEqual([1, 2, 3, 4, 5]);
  });

  it('delivers rows written after start when kicked', async () => {
    const store = new FakeStore();
    const publisher = recorder();
    const relay = new OutboxRelay({
      store,
      publisher,
      batchSize: 10,
      pollIntervalMs: 10_000,
      onError: () => undefined,
    });
    relay.start();
    await waitFor(() => store.drains > 0);
    store.pending.push(record(1));
    relay.kick();
    await waitFor(() => publisher.seen.length === 1);
    await relay.stop();
  });

  it('reports publish failures and retries on the next poll', async () => {
    const store = new FakeStore();
    store.pending = [record(1)];
    let fail = true;
    const errors: unknown[] = [];
    const seen: number[] = [];
    const relay = new OutboxRelay({
      store,
      publisher: {
        publish: async (_k, m) => {
          if (fail) throw new Error('broker down');
          seen.push(m.streamSequence);
        },
      },
      batchSize: 10,
      pollIntervalMs: 20,
      onError: (e) => {
        errors.push(e);
        fail = false;
      },
    });
    relay.start();
    await waitFor(() => seen.length === 1);
    await relay.stop();
    expect(errors).toHaveLength(1);
    expect(seen).toEqual([1]);
  });

  it('does nothing once stopped', async () => {
    const store = new FakeStore();
    const relay = new OutboxRelay({
      store,
      publisher: recorder(),
      batchSize: 1,
      pollIntervalMs: 5,
      onError: () => undefined,
    });
    relay.start();
    await relay.stop();
    const drains = store.drains;
    relay.kick();
    await new Promise((r) => setTimeout(r, 30));
    expect(store.drains).toBe(drains);
  });
});
