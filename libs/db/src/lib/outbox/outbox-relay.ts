import type { OutboxStore, StreamPublisher } from '../ports.js';

export interface OutboxRelayOptions {
  readonly store: OutboxStore;
  readonly publisher: StreamPublisher;
  readonly batchSize: number;
  readonly pollIntervalMs: number;
  readonly onError: (error: unknown) => void;
}

/**
 * Moves committed outbox rows to the broker. Polling bounds latency when no
 * kick arrives (for example rows written by another process); `kick()` gives
 * in-process writers near-immediate delivery.
 */
export class OutboxRelay {
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | undefined;
  private rerun = false;
  private stopped = true;

  constructor(private readonly options: OutboxRelayOptions) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.kick();
  }

  kick(): void {
    if (this.stopped) return;
    if (this.running) {
      this.rerun = true;
      return;
    }
    clearTimeout(this.timer);
    this.running = this.cycle().finally(() => {
      this.running = undefined;
      this.schedule();
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }

  /** Publishes one batch; exposed for tests and one-shot drains. */
  runOnce(): Promise<number> {
    const { store, publisher, batchSize } = this.options;
    return store.drain(batchSize, (record) =>
      publisher.publish(record.key, record.message),
    );
  }

  private async cycle(): Promise<void> {
    try {
      do {
        this.rerun = false;
        await this.drainBacklog();
      } while (this.rerun && !this.stopped);
    } catch (error) {
      this.rerun = false;
      this.options.onError(error);
    }
  }

  private async drainBacklog(): Promise<void> {
    let published: number;
    do {
      published = await this.runOnce();
    } while (published === this.options.batchSize && !this.stopped);
  }

  private schedule(): void {
    if (this.stopped) return;
    const delay = this.rerun ? 0 : this.options.pollIntervalMs;
    this.timer = setTimeout(() => this.kick(), delay);
    this.timer.unref();
  }
}
