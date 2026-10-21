import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ApiEnv } from '@matchiq/config';
import { EnvModule, HealthModule, HttpKitModule } from '@matchiq/server-kit';
import { OperatorAuthGuard } from './auth/operator-auth.guard';
import { API_LIMITS, SERVICE_NAME } from './constants';
import { FixturesController } from './fixtures/fixtures.controller';
import { FixturesService } from './fixtures/fixtures.service';
import {
  PostgresHealthIndicator,
  RedisHealthIndicator,
} from './infrastructure/health.indicators';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { OUTBOX_NOTIFIER } from './infrastructure/tokens';
import { IngestService } from './ingest/ingest.service';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { StreamController } from './stream/stream.controller';
import { StreamService } from './stream/stream.service';

@Module({})
export class AppModule {
  static forRoot(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        HttpKitModule,
        InfrastructureModule.forRoot(env),
        ThrottlerModule.forRoot([
          {
            ttl: API_LIMITS.rateLimitWindowMs,
            limit: env.RATE_LIMIT_PER_MINUTE,
          },
        ]),
        HealthModule.forRoot({
          service: SERVICE_NAME,
          version: env.APP_VERSION,
          indicators: [PostgresHealthIndicator, RedisHealthIndicator],
        }),
      ],
      controllers: [FixturesController, StreamController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        OperatorAuthGuard,
        FixturesService,
        IngestService,
        StreamService,
        OutboxRelayService,
        { provide: OUTBOX_NOTIFIER, useExisting: OutboxRelayService },
      ],
    };
  }
}
