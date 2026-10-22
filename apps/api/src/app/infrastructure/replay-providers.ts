import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import {
  BullMqReplayCommandBus,
  type DatabaseHandle,
  PostgresIntelligenceReader,
  PostgresSessionStore,
  PostgresTemplateStore,
  type SessionStore,
  type TemplateStore,
} from '@matchiq/db';
import { Redis } from 'ioredis';
import { QUEUE_CONNECTION_NAME } from '../constants';
import {
  DATABASE,
  INTELLIGENCE_READER,
  REPLAY_COMMAND_BUS,
  REPLAY_STORES,
  SESSION_STORE,
  TEMPLATE_STORE,
} from './tokens';

const QUEUE_REDIS_OPTIONS = {
  connectTimeout: 2_000,
  // Fail fast so a Redis outage answers 503 instead of hanging the request.
  maxRetriesPerRequest: 1,
  connectionName: QUEUE_CONNECTION_NAME,
} as const;

const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');

/** The stores behind replay control, grouped to keep its constructor small. */
export interface ReplayStores {
  readonly templates: TemplateStore;
  readonly sessions: SessionStore;
}

/** Closes the command-queue producer and its connection with the app. */
@Injectable()
class CommandBusLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(REPLAY_COMMAND_BUS) private readonly bus: BullMqReplayCommandBus,
    @Inject(QUEUE_CONNECTION) private readonly connection: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.bus.close();
    this.connection.disconnect();
  }
}

const fromDatabase = (
  token: symbol,
  build: (handle: DatabaseHandle) => unknown,
): Provider => ({ provide: token, useFactory: build, inject: [DATABASE] });

/** Stores and the API → worker command queue behind the replay and read endpoints. */
export const replayProviders = (env: ApiEnv): Provider[] => [
  fromDatabase(TEMPLATE_STORE, (h) => new PostgresTemplateStore(h.db)),
  fromDatabase(SESSION_STORE, (h) => new PostgresSessionStore(h.db)),
  fromDatabase(
    INTELLIGENCE_READER,
    (h) => new PostgresIntelligenceReader(h.db),
  ),
  {
    provide: REPLAY_STORES,
    useFactory: (templates: TemplateStore, sessions: SessionStore) => ({
      templates,
      sessions,
    }),
    inject: [TEMPLATE_STORE, SESSION_STORE],
  },
  {
    provide: QUEUE_CONNECTION,
    useFactory: () => {
      const logger = new Logger('ReplayCommandBus');
      const connection = new Redis(env.REDIS_URL, QUEUE_REDIS_OPTIONS);
      connection.on('error', (error: Error) => logger.warn(error.message));
      return connection;
    },
  },
  {
    provide: REPLAY_COMMAND_BUS,
    useFactory: (connection: Redis) =>
      new BullMqReplayCommandBus({ connection, prefix: env.REDIS_KEY_PREFIX }),
    inject: [QUEUE_CONNECTION],
  },
  CommandBusLifecycle,
];
