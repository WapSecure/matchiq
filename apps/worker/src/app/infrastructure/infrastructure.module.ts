import {
  type DynamicModule,
  Global,
  Logger,
  Module,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
  type Provider,
} from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import {
  BullMqInsightJobQueue,
  createDatabase,
  type DatabaseHandle,
  OutboxRelay,
  PostgresFixtureReader,
  PostgresIntelligenceReader,
  PostgresOutboxStore,
  PostgresPipelineUnitOfWork,
  PostgresSessionStore,
  PostgresTemplateStore,
} from '@matchiq/db';
import { createSystemScheduler, type Scheduler } from '@matchiq/replay';
import { type AgentsClient, HttpAgentsClient } from '../agents/agents-client';
import { SERVICE_NAME } from '../constants';
import { BUNDLE_PROVIDERS } from './bundles';
import { createWorkerRedis, type WorkerRedis } from './redis-connections';
import {
  AGENTS_CLIENT,
  CLOCK,
  type Clock,
  DATABASE,
  FIXTURE_READER,
  INSIGHT_JOB_QUEUE,
  INTELLIGENCE_READER,
  OUTBOX_NOTIFIER,
  type OutboxNotifier,
  PIPELINE_UOW,
  REDIS,
  REPLAY_SCHEDULER,
  SESSION_STORE,
  TEMPLATE_STORE,
} from './tokens';

interface OwnedResources {
  readonly database: DatabaseHandle;
  readonly redis: WorkerRedis;
  readonly jobs: BullMqInsightJobQueue;
}

/**
 * Owns connection lifecycles and runs an outbox relay in the worker, so its
 * writes reach SSE without waiting for the API's poll (ADR-0006 allows
 * several relays).
 */
class WorkerOutbox
  implements OutboxNotifier, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger('OutboxRelay');
  private readonly relay: OutboxRelay;
  private readonly enabled: boolean;

  constructor(
    private readonly resources: OwnedResources,
    env: WorkerEnv,
  ) {
    const { database, redis } = resources;
    this.relay = new OutboxRelay({
      store: new PostgresOutboxStore(database.db),
      publisher: redis.bus,
      batchSize: env.OUTBOX_BATCH_SIZE,
      pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS,
      onError: (error) =>
        this.logger.warn(
          error instanceof Error ? error.message : String(error),
        ),
    });
    this.enabled = env.OUTBOX_RELAY_ENABLED;
  }

  onApplicationBootstrap(): void {
    if (this.enabled) this.relay.start();
  }

  notify(): void {
    this.relay.kick();
  }

  async onApplicationShutdown(): Promise<void> {
    const { database, redis, jobs } = this.resources;
    await this.relay.stop();
    await jobs.close();
    await Promise.allSettled([database.close(), redis.close()]);
  }
}

const systemClock: Clock = { now: () => new Date() };

const fromDatabase = (
  token: symbol,
  build: (handle: DatabaseHandle) => unknown,
): Provider => ({
  provide: token,
  useFactory: build,
  inject: [DATABASE],
});

@Global()
@Module({})
export class InfrastructureModule {
  static forRoot(
    env: WorkerEnv,
    seams: { scheduler?: Scheduler; agentsClient?: AgentsClient } = {},
  ): DynamicModule {
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
          createWorkerRedis(env.REDIS_URL, env.REDIS_KEY_PREFIX),
      },
      fromDatabase(PIPELINE_UOW, (h) => new PostgresPipelineUnitOfWork(h.db)),
      fromDatabase(FIXTURE_READER, (h) => new PostgresFixtureReader(h.db)),
      fromDatabase(TEMPLATE_STORE, (h) => new PostgresTemplateStore(h.db)),
      fromDatabase(SESSION_STORE, (h) => new PostgresSessionStore(h.db)),
      fromDatabase(
        INTELLIGENCE_READER,
        (h) => new PostgresIntelligenceReader(h.db),
      ),
      {
        provide: INSIGHT_JOB_QUEUE,
        useFactory: (redis: WorkerRedis) =>
          new BullMqInsightJobQueue(redis.queues, {
            attempts: env.AGENT_MAX_RETRIES + 1,
            backoffMs: env.AGENT_RETRY_BACKOFF_MS,
          }),
        inject: [REDIS],
      },
      {
        provide: AGENTS_CLIENT,
        useValue:
          seams.agentsClient ??
          new HttpAgentsClient({
            baseUrl: env.AGENTS_SERVICE_URL,
            token: env.AGENTS_SERVICE_TOKEN,
            timeoutMs: env.AGENT_TIMEOUT_MS,
          }),
      },
      {
        provide: REPLAY_SCHEDULER,
        useFactory: () => seams.scheduler ?? createSystemScheduler(),
      },
      { provide: CLOCK, useValue: systemClock },
      {
        provide: WorkerOutbox,
        useFactory: (
          database: DatabaseHandle,
          redis: WorkerRedis,
          jobs: BullMqInsightJobQueue,
        ) => new WorkerOutbox({ database, redis, jobs }, env),
        inject: [DATABASE, REDIS, INSIGHT_JOB_QUEUE],
      },
      { provide: OUTBOX_NOTIFIER, useExisting: WorkerOutbox },
      ...BUNDLE_PROVIDERS,
    ];
    return {
      module: InfrastructureModule,
      providers,
      exports: providers,
    };
  }
}
