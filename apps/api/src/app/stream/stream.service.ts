import {
  type BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import type { FixtureKey, StreamHistory, StreamSubscriber } from '@matchiq/db';
import { APP_ENV } from '@matchiq/server-kit';
import { API_LIMITS } from '../constants';
import { problem } from '../http/problems';
import {
  CLOCK,
  type Clock,
  STREAM_HISTORY,
  STREAM_SUBSCRIBER,
} from '../infrastructure/tokens';
import type { StreamSink } from './sse-writer';
import { StreamSession } from './stream-session';

export interface OpenStreamCommand {
  readonly key: FixtureKey;
  readonly lastEventId: number | undefined;
  readonly sink: StreamSink;
  /** Registers the callback run when the client disconnects. */
  readonly onDisconnect: (callback: () => void) => void;
}

@Injectable()
export class StreamService implements BeforeApplicationShutdown {
  private readonly logger = new Logger(StreamService.name);
  private readonly sessions = new Set<StreamSession>();

  constructor(
    @Inject(APP_ENV) private readonly env: ApiEnv,
    @Inject(STREAM_HISTORY) private readonly history: StreamHistory,
    @Inject(STREAM_SUBSCRIBER) private readonly subscriber: StreamSubscriber,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  get openSessions(): number {
    return this.sessions.size;
  }

  async open(command: OpenStreamCommand): Promise<void> {
    if ((await this.history.head(command.key)) === null) {
      throw problem('fixtureNotFound', { detail: command.key.fixtureId });
    }
    const session = new StreamSession({
      key: command.key,
      history: this.history,
      subscriber: this.subscriber,
      sink: command.sink,
      heartbeatMs: this.env.SSE_HEARTBEAT_MS,
      pageSize: API_LIMITS.streamReplayPage,
      now: () => this.clock.now(),
      onError: (error) => this.logger.warn(describe(error)),
    });
    this.sessions.add(session);
    command.onDisconnect(() => void this.end(session));
    try {
      await session.start(command.lastEventId);
    } catch (error) {
      await this.end(session);
      this.logger.warn(describe(error));
      if (!command.sink.isOpen) throw problem('streamUnavailable');
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    await Promise.allSettled([...this.sessions].map((s) => this.end(s)));
  }

  private async end(session: StreamSession): Promise<void> {
    this.sessions.delete(session);
    await session.close();
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
