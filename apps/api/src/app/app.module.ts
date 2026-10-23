import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  ACCESS_DENIED_LISTENER,
  AuthenticationGuard,
  AuthModule,
  PermissionGuard,
} from '@matchiq/auth';
import type { ApiEnv } from '@matchiq/config';
import {
  EnvModule,
  HealthModule,
  HttpKitModule,
  TelemetryModule,
} from '@matchiq/server-kit';
import { AuditTrail } from './auth/audit-trail.service';
import { PrincipalThrottlerGuard } from './auth/principal-throttler.guard';
import { AuditController } from './editorial/audit.controller';
import { EditorialControlsService } from './editorial/editorial-controls.service';
import {
  EditorialController,
  EditorialControlsController,
} from './editorial/editorial.controller';
import { EditorialEffects } from './editorial/editorial-writes';
import { EditorialService } from './editorial/editorial.service';
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
import { OpenApiModule } from './openapi/openapi.module';
import { MeController } from './me/me.controller';
import { PreferencesController } from './me/preferences.controller';
import { PreferencesService } from './me/preferences.service';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { IntelligenceController } from './intelligence/intelligence.controller';
import { IntelligenceService } from './intelligence/intelligence.service';
import { LobbyController, ReplayController } from './replay/replay.controller';
import { replayThrottler } from './replay/replay-throttle';
import { ReplayService } from './replay/replay.service';
import { StreamController } from './stream/stream.controller';
import { StreamService } from './stream/stream.service';
import { StreamGauges } from './telemetry/stream-gauges';

export const API_CONTROLLERS = [
  FixturesController,
  StreamController,
  ReplayController,
  LobbyController,
  IntelligenceController,
  EditorialController,
  EditorialControlsController,
  AuditController,
  MeController,
  PreferencesController,
];

@Module({})
export class AppModule {
  static forRoot(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        TelemetryModule.forRoot({ service: SERVICE_NAME }),
        HttpKitModule,
        AuthModule.forRoot(env),
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
        OpenApiModule.forRoot(env),
        HealthModule.forRoot({
          service: SERVICE_NAME,
          version: env.APP_VERSION,
          indicators: [PostgresHealthIndicator, RedisHealthIndicator],
        }),
      ],
      controllers: API_CONTROLLERS,
      providers: [
        // Order matters (ADR-0018): who is calling, then their budget, then what they may do.
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PrincipalThrottlerGuard },
        { provide: APP_GUARD, useClass: PermissionGuard },
        AuditTrail,
        { provide: ACCESS_DENIED_LISTENER, useExisting: AuditTrail },
        EditorialEffects,
        EditorialService,
        EditorialControlsService,
        IdempotencyService,
        FixturesService,
        IngestService,
        StreamService,
        OutboxRelayService,
        ReplayService,
        IntelligenceService,
        PreferencesService,
        StreamGauges,
        { provide: OUTBOX_NOTIFIER, useExisting: OutboxRelayService },
      ],
    };
  }
}
