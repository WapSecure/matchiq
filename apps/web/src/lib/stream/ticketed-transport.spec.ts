import type { SseRequest, SseTransport } from './sse-transport';
import { ticketedSseTransport } from './ticketed-transport';

describe('ticketedSseTransport', () => {
  it('fetches a fresh ticket for every connection and appends it to the URL', async () => {
    const seen: string[] = [];
    const base: SseTransport = async function* (request: SseRequest) {
      seen.push(request.url);
      yield* [];
    };
    let n = 0;
    const transport = ticketedSseTransport(async () => `t${(n += 1)}`, base);
    const request = {
      url: 'http://api.test/api/v1/fixtures/fx_1/stream',
      lastEventId: null,
      signal: new AbortController().signal,
    };
    for (let i = 0; i < 2; i += 1) {
      for await (const frame of transport(request)) void frame;
    }
    expect(seen).toEqual([
      'http://api.test/api/v1/fixtures/fx_1/stream?ticket=t1',
      'http://api.test/api/v1/fixtures/fx_1/stream?ticket=t2',
    ]);
  });

  it('fails the attempt when no ticket can be obtained', async () => {
    const transport = ticketedSseTransport(async () => {
      throw new Error('401');
    });
    const frames = transport({
      url: 'http://api.test/s',
      lastEventId: null,
      signal: new AbortController().signal,
    });
    await expect(frames[Symbol.asyncIterator]().next()).rejects.toThrow('401');
  });
});
