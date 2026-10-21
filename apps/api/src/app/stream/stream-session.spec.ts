import type { StreamMessage } from '@matchiq/contracts';
import type { StreamHistory, StreamSubscriber } from '@matchiq/db';
import { buildTestEvent } from '@matchiq/db/testing';
import type { StreamSink } from './sse-writer';
import { StreamSession } from './stream-session';

const FX = 'fx_unit';
const message = (streamSequence: number): StreamMessage => ({
  schemaVersion: 1,
  streamSequence,
  fixtureId: FX,
  emittedAt: '2026-10-21T12:00:00.000Z',
  type: 'match.event',
  payload: buildTestEvent(FX, streamSequence),
});

const history = (stored: StreamMessage[], fail = false): StreamHistory => ({
  head: async () => stored.length,
  read: async (_key, { after, limit, upTo }) => {
    if (fail) throw new Error('db down');
    return stored
      .filter((m) => m.streamSequence > after)
      .filter((m) => upTo === undefined || m.streamSequence <= upTo)
      .slice(0, limit);
  },
});

class RecordingSink implements StreamSink {
  sent: number[] = [];
  isOpen = false;
  closed = false;
  open = () => {
    this.isOpen = true;
  };
  send = (m: StreamMessage, withId: boolean) => {
    if (withId) this.sent.push(m.streamSequence);
  };
  close = () => {
    this.closed = true;
  };
}

const manualSubscriber = () => {
  let push: (m: StreamMessage) => void = () => undefined;
  const unsubscribe = jest.fn(async () => undefined);
  const subscriber: StreamSubscriber = {
    subscribe: async (_key, onMessage) => {
      push = onMessage;
      return unsubscribe;
    },
  };
  return { subscriber, unsubscribe, push: (m: StreamMessage) => push(m) };
};

const sessionFor = (
  stored: StreamMessage[],
  subscriber: StreamSubscriber,
  sink: StreamSink,
  fail = false,
) =>
  new StreamSession({
    key: { orgId: 'org_demo', fixtureId: FX },
    history: history(stored, fail),
    subscriber,
    sink,
    heartbeatMs: 60_000,
    pageSize: 2,
    now: () => new Date('2026-10-21T12:00:00.000Z'),
    onError: () => undefined,
  });

const settle = () => new Promise((r) => setTimeout(r, 5));

describe('StreamSession', () => {
  it('replays across pages, then fills live gaps and drops repeats', async () => {
    const stored = [1, 2, 3, 4, 5, 6].map(message);
    const live = manualSubscriber();
    const sink = new RecordingSink();
    const session = sessionFor(stored, live.subscriber, sink);
    await session.start(1);
    expect(sink.sent).toEqual([2, 3, 4, 5, 6]);

    stored.push(message(7), message(8));
    live.push(message(8));
    live.push(message(7));
    live.push(message(8));
    await settle();
    expect(sink.sent).toEqual([2, 3, 4, 5, 6, 7, 8]);
    await session.close();
    expect(live.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not open the sink when subscribing fails', async () => {
    const sink = new RecordingSink();
    const failing: StreamSubscriber = {
      subscribe: () => Promise.reject(new Error('redis down')),
    };
    await expect(sessionFor([], failing, sink).start(0)).rejects.toThrow();
    expect(sink.isOpen).toBe(false);
  });

  it('closes the stream when the replay read fails', async () => {
    const live = manualSubscriber();
    const sink = new RecordingSink();
    const session = sessionFor([message(1)], live.subscriber, sink, true);
    await expect(session.start(0)).rejects.toThrow('db down');
    live.push(message(2));
    await settle();
    expect(sink.closed).toBe(true);
    expect(live.unsubscribe).toHaveBeenCalled();
  });
});
