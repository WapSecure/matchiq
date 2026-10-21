import { SCHEMA_VERSION, StreamMessage } from '@matchiq/contracts';
import type {
  FixtureKey,
  StreamHistory,
  StreamSubscriber,
  Unsubscribe,
} from '@matchiq/db';
import type { StreamSink } from './sse-writer';

export interface StreamSessionOptions {
  readonly key: FixtureKey;
  readonly history: StreamHistory;
  readonly subscriber: StreamSubscriber;
  readonly sink: StreamSink;
  readonly heartbeatMs: number;
  readonly pageSize: number;
  readonly now: () => Date;
  readonly onError: (error: unknown) => void;
}

/**
 * One SSE subscriber. It subscribes to live messages first, then replays from
 * Postgres, then applies live messages, all on one serial queue. A cursor of
 * the last delivered streamSequence drops duplicates, and any gap in the live
 * feed is filled from Postgres: stream sequences commit in order, so a visible
 * sequence N means every sequence below N is already readable.
 */
export class StreamSession {
  private cursor = 0;
  private queue: Promise<void> = Promise.resolve();
  private heartbeat: NodeJS.Timeout | undefined;
  private unsubscribe: Unsubscribe | undefined;
  private closed = false;

  constructor(private readonly options: StreamSessionOptions) {}

  /**
   * Rejects before the sink is opened when the live feed is unavailable, so the
   * caller can still answer with a problem response.
   */
  async start(lastEventId: number | undefined): Promise<void> {
    let openGate: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (openGate = resolve));
    this.queue = gate.then(() => this.catchUp(lastEventId));
    this.unsubscribe = await this.options.subscriber.subscribe(
      this.options.key,
      (message) => this.enqueue(() => this.onLive(message)),
    );
    if (this.closed) {
      await this.unsubscribe();
      return;
    }
    this.options.sink.open();
    openGate();
    await this.queue;
    if (this.closed) return;
    this.heartbeat = setInterval(
      () => this.sendHeartbeat(),
      this.options.heartbeatMs,
    );
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeat);
    this.options.sink.close();
    await this.unsubscribe?.();
  }

  private enqueue(task: () => Promise<void>): void {
    this.queue = this.queue.then(task).catch((error: unknown) => {
      this.options.onError(error);
      return this.close();
    });
  }

  private async catchUp(lastEventId: number | undefined): Promise<void> {
    if (lastEventId === undefined) {
      this.cursor = (await this.options.history.head(this.options.key)) ?? 0;
      return;
    }
    this.cursor = lastEventId;
    await this.replay(undefined);
  }

  private async onLive(message: StreamMessage): Promise<void> {
    if (this.closed || message.streamSequence <= this.cursor) return;
    if (message.streamSequence > this.cursor + 1) {
      await this.replay(message.streamSequence - 1);
    }
    this.deliver(message);
  }

  private async replay(upTo: number | undefined): Promise<void> {
    const { history, key, pageSize } = this.options;
    for (;;) {
      if (this.closed) return;
      const page = await history.read(key, {
        after: this.cursor,
        limit: pageSize,
        upTo,
      });
      page.forEach((message) => this.deliver(message));
      if (page.length < pageSize) return;
    }
  }

  private deliver(message: StreamMessage): void {
    if (this.closed || message.streamSequence <= this.cursor) return;
    this.cursor = message.streamSequence;
    const checked = StreamMessage.safeParse(message);
    if (!checked.success) {
      this.options.onError(checked.error);
      return;
    }
    this.options.sink.send(checked.data, true);
  }

  private sendHeartbeat(): void {
    if (this.closed) return;
    this.options.sink.send(
      {
        schemaVersion: SCHEMA_VERSION,
        streamSequence: this.cursor,
        fixtureId: this.options.key.fixtureId,
        emittedAt: this.options.now().toISOString(),
        type: 'heartbeat',
        payload: {},
      },
      false,
    );
  }
}
