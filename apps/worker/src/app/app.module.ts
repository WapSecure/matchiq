import { type DynamicModule, Module, type Provider } from '@nestjs/common';
import type { WorkerEnv } from '@matchiq/config';
import type { Scheduler } from '@matchiq/replay';
import { EnvModule, HealthModule, HttpKitModule } from '@matchiq/server-kit';
import type { AgentsClient } from './agents/agents-client';
import { InsightPipelineService } from './agents/insight-pipeline.service';
import { SERVICE_NAME } from './constants';
import {
  AgentsHealthIndicator,
  PostgresHealthIndicator,
  RedisHealthIndicator,
} from './infrastructure/health.indicators';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import {
  QUEUE_CONSUMERS,
  type QueueConsumerConfig,
  QueueConsumers,
} from './queues/queue-consumers';
import { RecapService } from './recap/recap.service';
import { SessionManager } from './replay/session-manager.service';

/** Test seams: a virtual-time scheduler, a fake agents client, no queue consumers. */
export interface WorkerOverrides {
  readonly scheduler?: Scheduler;
  readonly agentsClient?: AgentsClient;
  readonly consumeQueues?: boolean;
}

@Module({})
export class AppModule {
  static forRoot(
    env: WorkerEnv,
    overrides: WorkerOverrides = {},
  ): DynamicModule {
    const seams: Provider[] = [
      {
        provide: QUEUE_CONSUMERS,
        useValue: {
          enabled: overrides.consumeQueues ?? true,
          insightConcurrency: env.AGENT_JOB_CONCURRENCY,
        } satisfies QueueConsumerConfig,
      },
    ];
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        HttpKitModule,
        InfrastructureModule.forRoot(env, overrides),
        HealthModule.forRoot({
          service: SERVICE_NAME,
          version: env.APP_VERSION,
          indicators: [
            PostgresHealthIndicator,
            RedisHealthIndicator,
            AgentsHealthIndicator,
          ],
        }),
      ],
      providers: [
        ...seams,
        RecapService,
        SessionManager,
        InsightPipelineService,
        QueueConsumers,
      ],
      exports: [SessionManager, InsightPipelineService, RecapService],
    };
  }
}
