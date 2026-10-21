import type { StreamMessage } from '@matchiq/contracts';
import { createFakeTransport, frameOf } from '@/test/fake-transport';
import { FX, message, shot } from '@/test/factories';
import type { ConnectionState, NetworkMonitor } from './connection';
import {
  MatchStreamClient,
  type MatchStreamClientOptions,
} from './match-stream-client';

const heartbeat = (seq: number) => message('heartbeat', {}, seq);
const event = (seq: number) => message('match.event', shot(seq), seq);

const flush = async () => {
  for (let i = 0; i < 50; i += 1) await Promise.resolve();
};

const onlineNetwork = (): NetworkMonitor & { set: (v: boolean) => void } => {
  let online = true;
  let listener: ((v: boolean) => void) | null = null;
  return {
    isOnline: () => online,
    subscribe: (fn) => {
      listener = fn;
      return () => {
        listener = null;
      };
    },
    set: (v) => {
      online = v;
      listener?.(v);
    },
  };
};

const setup = (overrides: Partial<MatchStreamClientOptions> = {}) => {
  const fake = createFakeTransport();
  const received: StreamMessage[] = [];
  const states: ConnectionState[] = [];
  const network = onlineNetwork();
  const client = new MatchStreamClient({
    url: 'http://api.test/stream',
    fixtureId: FX,
    transport: fake.transport,
    network,
    random: () => 0.5,
    onMessage: (m) => received.push(m),
    onStatus: (s) => states.push(s.state),
    ...overrides,
  });
  return { client, fake, received, states, network };
};

describe('MatchStreamClient', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('validates frames and drops anything outside the contract', async () => {
    const onInvalidMessage = vi.fn();
    const { client, fake, received } = setup({ onInvalidMessage });
    client.start();
    const conn = fake.connections[0];
    conn?.push({
      id: '1',
      event: 'heartbeat',
      data: '{"nope":true}',
      retryMs: null,
    });
    conn?.push({
      id: '2',
      event: 'heartbeat',
      data: 'not json',
      retryMs: null,
    });
    conn?.push({ ...frameOf(heartbeat(3)), event: 'match.event' });
    conn?.push(frameOf({ ...heartbeat(4), fixtureId: 'fx_other' }));
    await flush();
    expect(received).toEqual([]);
    expect(onInvalidMessage).toHaveBeenCalledTimes(4);
    client.stop();
  });

  it('dedupes by streamSequence across redelivery', async () => {
    const { client, fake, received } = setup();
    client.start();
    const conn = fake.connections[0];
    [event(1), event(2), event(2), event(1), event(3)].forEach((m) =>
      conn?.push(frameOf(m)),
    );
    await flush();
    expect(received.map((m) => m.streamSequence)).toEqual([1, 2, 3]);
    client.stop();
  });

  it('goes live on the first valid message', async () => {
    const { client, fake, states } = setup();
    client.start();
    fake.connections[0]?.push(frameOf(heartbeat(1)));
    await flush();
    expect(client.connection.state).toBe('live');
    expect(states).toEqual(['live']);
    client.stop();
  });

  it('reconnects with exponential backoff and resumes from Last-Event-ID', async () => {
    const { client, fake, states } = setup({
      backoff: { baseMs: 1_000, maxMs: 8_000, jitterRatio: 0 },
    });
    client.start();
    expect(fake.connections[0]?.request.lastEventId).toBeNull();
    fake.connections[0]?.push(frameOf(event(7)));
    await flush();
    fake.connections[0]?.fail(new Error('reset'));
    await flush();
    expect(client.connection).toMatchObject({
      state: 'reconnecting',
      retryInMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(999);
    expect(fake.connections).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.connections[1]?.request.lastEventId).toBe('7');
    fake.connections[1]?.fail(new Error('again'));
    await flush();
    expect(client.connection.retryInMs).toBe(2_000);
    await vi.advanceTimersByTimeAsync(2_000);
    fake.connections[2]?.end();
    await flush();
    expect(client.connection.retryInMs).toBe(4_000);
    expect(states).toContain('reconnecting');
    client.stop();
  });

  it('resets the backoff after a healthy message', async () => {
    const { client, fake } = setup({
      backoff: { baseMs: 1_000, maxMs: 8_000, jitterRatio: 0 },
    });
    client.start();
    fake.connections[0]?.fail(new Error('x'));
    await flush();
    await vi.advanceTimersByTimeAsync(1_000);
    fake.connections[1]?.push(frameOf(heartbeat(1)));
    await flush();
    expect(client.connection.attempt).toBe(0);
    fake.connections[1]?.fail(new Error('y'));
    await flush();
    expect(client.connection.retryInMs).toBe(1_000);
    client.stop();
  });

  it('holds messages behind a gap until the snapshot refetch completes', async () => {
    let release: () => void = () => undefined;
    const onGap = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const { client, fake, received } = setup({ onGap });
    client.start();
    const conn = fake.connections[0];
    conn?.push(frameOf(event(1)));
    conn?.push(frameOf(event(4)));
    conn?.push(frameOf(event(5)));
    await flush();
    expect(onGap).toHaveBeenCalledWith({ expected: 2, received: 4 });
    expect(received.map((m) => m.streamSequence)).toEqual([1]);
    release();
    await flush();
    expect(received.map((m) => m.streamSequence)).toEqual([1, 4, 5]);
    client.stop();
  });

  it('marks a silent stream stale, then tears it down and reconnects', async () => {
    const { client, fake } = setup({
      staleAfterMs: 5_000,
      reconnectAfterStaleMs: 10_000,
      backoff: { baseMs: 500, maxMs: 500, jitterRatio: 0 },
    });
    client.start();
    fake.connections[0]?.push(frameOf(heartbeat(1)));
    await flush();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(client.connection.state).toBe('stale');
    fake.connections[0]?.push(frameOf(heartbeat(2)));
    await flush();
    expect(client.connection.state).toBe('live');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(client.connection.state).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(500);
    expect(fake.connections).toHaveLength(2);
    expect(fake.connections[1]?.request.lastEventId).toBe('2');
    client.stop();
  });

  it('goes offline with the browser and reconnects when it returns', async () => {
    const { client, fake, network } = setup();
    client.start();
    fake.connections[0]?.push(frameOf(heartbeat(1)));
    await flush();
    network.set(false);
    await flush();
    expect(client.connection.state).toBe('offline');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.connections).toHaveLength(1);
    network.set(true);
    await flush();
    expect(fake.connections).toHaveLength(2);
    expect(fake.connections[1]?.request.lastEventId).toBe('1');
    client.stop();
  });

  it('stops cleanly without reconnecting', async () => {
    const { client, fake } = setup();
    client.start();
    client.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fake.connections).toHaveLength(1);
    expect(fake.connections[0]?.request.signal.aborted).toBe(true);
  });
});
