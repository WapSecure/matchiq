import { type DynamicModule, Module } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import { EnvModule, HealthModule, HttpKitModule } from '@matchiq/server-kit';
import { SERVICE_NAME } from './constants';

@Module({})
export class AppModule {
  static forRoot(env: ApiEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        EnvModule.forRoot(env),
        HttpKitModule,
        HealthModule.forRoot({
          service: SERVICE_NAME,
          version: env.APP_VERSION,
        }),
      ],
    };
  }
}
