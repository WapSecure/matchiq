import type { StreamMessage } from '@matchiq/contracts';
import type { Response } from 'express';
import { SSE } from '../constants';

export interface StreamSink {
  open(): void;
  readonly isOpen: boolean;
  /** `withId: false` keeps the client's Last-Event-ID unchanged (heartbeats). */
  send(message: StreamMessage, withId: boolean): void;
  close(): void;
}

/** Writes Server-Sent Events frames (WHATWG HTML §9.2) to an Express response. */
export class SseWriter implements StreamSink {
  private opened = false;

  constructor(private readonly res: Response) {}

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    this.opened = true;
    this.res.status(200);
    this.res.setHeader('Content-Type', SSE.contentType);
    this.res.setHeader('Cache-Control', SSE.cacheControl);
    this.res.setHeader('Connection', SSE.connection);
    this.res.setHeader('X-Accel-Buffering', SSE.noBuffering);
    this.res.flushHeaders();
    this.res.write(`retry: ${SSE.retryMs}\n\n`);
  }

  send(message: StreamMessage, withId: boolean): void {
    if (this.res.writableEnded) return;
    const id = withId ? `id: ${message.streamSequence}\n` : '';
    // JSON.stringify never emits raw newlines, so one data line is safe.
    this.res.write(
      `${id}event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`,
    );
  }

  /** Never ends an unopened response, which may still carry a problem body. */
  close(): void {
    if (this.opened && !this.res.writableEnded) this.res.end();
  }
}
