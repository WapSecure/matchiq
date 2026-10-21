import { backoffDelay } from './backoff';
import { SseParser } from './sse-parser';
import { fetchSseTransport, SseHttpError } from './sse-transport';

const streamOf = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      chunks.forEach((c) => controller.enqueue(encoder.encode(c)));
      controller.close();
    },
  });

describe('SseParser', () => {
  it('assembles frames across arbitrary chunk boundaries', () => {
    const parser = new SseParser();
    expect(parser.push('id: 4\nevent: heart')).toEqual([]);
    expect(
      parser.push('beat\ndata: {}\n\nid: 5\r\ndata: a\r\ndata: b\r\n\r\n'),
    ).toEqual([
      { id: '4', event: 'heartbeat', data: '{}', retryMs: null },
      { id: '5', event: 'message', data: 'a\nb', retryMs: null },
    ]);
  });

  it('ignores comments and empty dispatches, and records retry', () => {
    const parser = new SseParser();
    expect(
      parser.push(': keep-alive\n\nretry: 2500\nretry: soon\ndata: x\n\n'),
    ).toEqual([{ id: null, event: 'message', data: 'x', retryMs: 2500 }]);
  });
});

describe('backoffDelay', () => {
  const policy = { baseMs: 1_000, maxMs: 30_000, jitterRatio: 0.2 };

  it('grows exponentially and caps at the maximum', () => {
    const mid = () => 0.5;
    expect(
      [0, 1, 2, 3, 4, 5, 6].map((a) => backoffDelay(a, policy, mid)),
    ).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]);
  });

  it('applies bounded jitter', () => {
    expect(backoffDelay(2, policy, () => 0)).toBe(3_200);
    expect(backoffDelay(2, policy, () => 0.999_999)).toBe(4_800);
  });
});

describe('fetchSseTransport', () => {
  it('sends Last-Event-ID on resume and yields parsed frames', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(streamOf(['id: 9\nevent: heartbeat\nda', 'ta: {}\n\n']), {
          headers: { 'content-type': 'text/event-stream' },
        }),
    );
    const transport = fetchSseTransport(fetchImpl);
    const frames = [];
    for await (const frame of transport({
      url: 'http://api.test/s',
      lastEventId: '8',
      signal: new AbortController().signal,
    })) {
      frames.push(frame);
    }
    expect(frames).toEqual([
      { id: '9', event: 'heartbeat', data: '{}', retryMs: null },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/s',
      expect.objectContaining({
        headers: { Accept: 'text/event-stream', 'Last-Event-ID': '8' },
      }),
    );
  });

  it('omits Last-Event-ID on a first connection and surfaces HTTP failures', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 503 }));
    const iterator = fetchSseTransport(fetchImpl)({
      url: 'u',
      lastEventId: null,
      signal: new AbortController().signal,
    });
    await expect(
      iterator[Symbol.asyncIterator]().next(),
    ).rejects.toBeInstanceOf(SseHttpError);
    expect(fetchImpl).toHaveBeenCalledWith(
      'u',
      expect.objectContaining({ headers: { Accept: 'text/event-stream' } }),
    );
  });
});
