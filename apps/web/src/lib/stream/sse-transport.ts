import { HTTP_HEADERS, MEDIA_TYPES } from '@/constants/api';
import { type SseFrame, SseParser } from './sse-parser';

export type SseRequest = {
  url: string;
  lastEventId: string | null;
  signal: AbortSignal;
};

/** Yields frames until the server closes the stream or the signal aborts. */
export type SseTransport = (request: SseRequest) => AsyncIterable<SseFrame>;

const ignore = (): void => undefined;

export class SseHttpError extends Error {
  constructor(readonly status: number) {
    super(`Stream request failed with HTTP ${status}`);
    this.name = 'SseHttpError';
  }
}

/**
 * fetch-based transport. Native `EventSource` cannot set `Last-Event-ID` on a
 * connection it did not open itself, so a client-managed reconnect would lose
 * the resume point (ADR-0005). Streaming fetch keeps the header under our control.
 */
export const fetchSseTransport = (
  fetchImpl: typeof fetch = fetch,
): SseTransport =>
  async function* stream({ url, lastEventId, signal }) {
    const headers: Record<string, string> = {
      [HTTP_HEADERS.accept]: MEDIA_TYPES.eventStream,
    };
    if (lastEventId !== null) headers[HTTP_HEADERS.lastEventId] = lastEventId;
    const response = await fetchImpl(url, {
      headers,
      signal,
      cache: 'no-store',
    });
    if (!response.ok || !response.body) throw new SseHttpError(response.status);
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    const parser = new SseParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield* parser.push(value);
      }
    } finally {
      await reader.cancel().catch(ignore);
    }
  };
