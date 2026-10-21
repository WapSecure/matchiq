export interface SseFrame {
  readonly id?: string;
  readonly event?: string;
  readonly data: string;
}

const parseFrame = (block: string): SseFrame | undefined => {
  let id: string | undefined;
  let event: string | undefined;
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'id') id = value;
    else if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  if (data.length === 0) return undefined;
  return { id, event, data: data.join('\n') };
};

/** Minimal streaming SSE client for tests; collects frames as they arrive. */
export class SseClient {
  readonly frames: SseFrame[] = [];
  status = 0;
  private readonly abort = new AbortController();
  private done: Promise<void> = Promise.resolve();

  static async connect(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<SseClient> {
    const client = new SseClient();
    const res = await fetch(url, { headers, signal: client.abort.signal });
    client.status = res.status;
    if (res.body) client.done = client.pump(res.body);
    return client;
  }

  /** Frames that carry an SSE id, i.e. everything except heartbeats. */
  get ids(): number[] {
    return this.frames.flatMap((f) =>
      f.id === undefined ? [] : [Number(f.id)],
    );
  }

  async waitFor(
    predicate: (client: SseClient) => boolean,
    timeoutMs = 5_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!predicate(this)) {
      if (Date.now() > deadline) {
        throw new Error(`SSE wait timed out; ids=${this.ids.join(',')}`);
      }
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  async close(): Promise<void> {
    this.abort.abort();
    await this.done;
  }

  /** Parses complete frames and returns the unterminated remainder. */
  private consume(buffer: string): string {
    const blocks = buffer.split('\n\n');
    const rest = blocks.pop() ?? '';
    for (const block of blocks) {
      const frame = parseFrame(block);
      if (frame) this.frames.push(frame);
    }
    return rest;
  }

  private async pump(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buffer = this.consume(buffer + decoder.decode(value, { stream: true }));
      }
    } catch {
      // Aborted by close().
    }
  }
}
