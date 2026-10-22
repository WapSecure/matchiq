import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { ApiEnv } from '@matchiq/config';
import { EnvModule, HealthModule, HttpKitModule } from '@matchiq/server-kit';
import { OperatorAuthGuard } from './auth/operator-auth.guard';
import { IdempotencyService } from './http/idempotency.service';
import { API_LIMITS, SERVICE_NAME, THROTTLERS } from './constants';
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
import { IntelligenceController } from './intelligence/intelligence.controller';
import { IntelligenceService } from './intelligence/intelligence.service';
import { LobbyController, ReplayController } from './replay/replay.controller';
import { replayThrottler } from './replay/replay-throttle';
import { ReplayService } from './replay/replay.service';
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
            name: THROTTLERS.default,
            ttl: API_LIMITS.rateLimitWindowMs,
            limit: env.RATE_LIMIT_PER_MINUTE,
          },
          replayThrottler(
            env.REPLAY_RATE_LIMIT_PER_MINUTE,
            API_LIMITS.rateLimitWindowMs,
          ),
        ]),
        HealthModule.forRoot({
          service: SERVICE_NAME,
          version: env.APP_VERSION,
          indicators: [PostgresHealthIndicator, RedisHealthIndicator],
        }),
      ],
      controllers: [
        FixturesController,
        StreamController,
        ReplayController,
        LobbyController,
        IntelligenceController,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        OperatorAuthGuard,
        IdempotencyService,
        FixturesService,
        IngestService,
        StreamService,
        OutboxRelayService,
        ReplayService,
        IntelligenceService,
        { provide: OUTBOX_NOTIFIER, useExisting: OutboxRelayService },
      ],
    };
  }
}
