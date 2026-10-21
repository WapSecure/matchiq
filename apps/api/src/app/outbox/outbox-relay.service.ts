import {
  type BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import {
  OutboxRelay,
  type OutboxStore,
  type StreamPublisher,
} from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import {
  OUTBOX_STORE,
  type OutboxNotifier,
  STREAM_PUBLISHER,
} from '../infrastructure/tokens';

/**
 * Runs the outbox relay inside the API process, next to the writers that kick
 * it. Several API replicas may run it at once; row locks keep them apart.
 */
@Injectable()
export class OutboxRelayService
  implements OnApplicationBootstrap, BeforeApplicationShutdown, OutboxNotifier
{
  private readonly logger = new Logger(OutboxRelayService.name);
  private readonly relay: OutboxRelay;

  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(OUTBOX_STORE) store: OutboxStore,
    @Inject(STREAM_PUBLISHER) publisher: StreamPublisher,
  ) {
    this.relay = new OutboxRelay({
      store,
      publisher,
      batchSize: env.OUTBOX_BATCH_SIZE,
      pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
      onError: (error) =>
        this.logger.warn(
          `Outbox relay cycle failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
    });
  }

  onApplicationBootstrap(): void {
    if (this.env.OUTBOX_RELAY_ENABLED) this.relay.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await this.relay.stop();
  }

  notify(): void {
    this.relay.kick();
  }

  /** One synchronous batch, independent of the background loop. */
  drainOnce(): Promise<number> {
    return this.relay.runOnce();
  }
}
