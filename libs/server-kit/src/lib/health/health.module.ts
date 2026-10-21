import {
  type DynamicModule,
  Module,
  type Provider,
  type Type,
} from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import {
  HEALTH_INDICATORS,
  HEALTH_OPTIONS,
  type HealthIndicator,
  type HealthModuleOptions,
} from './health.types';

export interface HealthModuleConfig extends HealthModuleOptions {
  readonly indicators?: readonly Type<HealthIndicator>[];
  readonly imports?: DynamicModule['imports'];
}

@Module({})
export class HealthModule {
  static forRoot({
    indicators = [],
    imports = [],
    ...options
  }: HealthModuleConfig): DynamicModule {
    const indicatorsProvider: Provider = {
      provide: HEALTH_INDICATORS,
      useFactory: (...resolved: HealthIndicator[]) => resolved,
      inject: [...indicators],
    };
    return {
      module: HealthModule,
      imports,
      controllers: [HealthController],
      providers: [
        ...indicators,
        { provide: HEALTH_OPTIONS, useValue: options },
        indicatorsProvider,
        HealthService,
      ],
    };
  }
}
