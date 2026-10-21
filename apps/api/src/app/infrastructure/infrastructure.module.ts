import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import {
  createDatabase,
  type DatabaseHandle,
  PostgresEventReader,
  PostgresFixtureReader,
  PostgresOutboxStore,
  PostgresStreamHistory,
  PostgresUnitOfWork,
} from '@matchiq/db';
import { SERVICE_NAME } from '../constants';
import {
  createRedisConnections,
  type RedisConnections,
} from './redis-connections';
import {
  CLOCK,
  type Clock,
  DATABASE,
  EVENT_READER,
  FIXTURE_READER,
  OUTBOX_STORE,
  REDIS,
  STREAM_HISTORY,
  STREAM_PUBLISHER,
  STREAM_SUBSCRIBER,
  UNIT_OF_WORK,
} from './tokens';

@Injectable()
class ConnectionLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(DATABASE) private readonly database: DatabaseHandle,
    @Inject(REDIS) private readonly redis: RedisConnections,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.database.close(), this.redis.close()]);
  }
}

const fromDatabase = (
  token: symbol,
  build: (handle: DatabaseHandle) => unknown,
): Provider => ({
  provide: token,
  useFactory: (handle: DatabaseHandle) => build(handle),
  inject: [DATABASE],
});

const fromRedis = (token: symbol): Provider => ({
  provide: token,
  useFactory: (redis: RedisConnections) => redis.bus,
  inject: [REDIS],
});

const systemClock: Clock = { now: () => new Date() };

/** Postgres and Redis adapters bound to the ports in `@matchiq/db`. */
@Global()
@Module({})
export class InfrastructureModule {
  static forRoot(env: ApiEnv): DynamicModule {
    const logger = new Logger('Postgres');
    const providers: Provider[] = [
      {
        provide: DATABASE,
        useFactory: () =>
          createDatabase({
            url: env.DATABASE_URL,
            poolMax: env.DATABASE_POOL_MAX,
            applicationName: SERVICE_NAME,
            onIdleError: (error) => logger.warn(error.message),
          }),
      },
      {
        provide: REDIS,
        useFactory: () =>
          createRedisConnections(env.REDIS_URL, env.REDIS_KEY_PREFIX),
      },
      fromDatabase(UNIT_OF_WORK, (h) => new PostgresUnitOfWork(h.db)),
      fromDatabase(FIXTURE_READER, (h) => new PostgresFixtureReader(h.db)),
      fromDatabase(EVENT_READER, (h) => new PostgresEventReader(h.db)),
      fromDatabase(STREAM_HISTORY, (h) => new PostgresStreamHistory(h.db)),
      fromDatabase(OUTBOX_STORE, (h) => new PostgresOutboxStore(h.db)),
      fromRedis(STREAM_PUBLISHER),
      fromRedis(STREAM_SUBSCRIBER),
      { provide: CLOCK, useValue: systemClock },
      ConnectionLifecycle,
    ];
    return {
      module: InfrastructureModule,
      providers,
      exports: providers.filter((p) => p !== ConnectionLifecycle),
    };
  }
}
