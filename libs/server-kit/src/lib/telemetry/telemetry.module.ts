import {
  type DynamicModule,
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpObserver, REQUEST_OBSERVER } from './http-observer';
import { LogContextInterceptor } from './log-context.interceptor';
import { createMetricsRegistry, METRICS_REGISTRY } from './metrics';

/** Flushes what bootstrap started outside Nest (trace exporter, metrics listener). */
@Injectable()
export class TelemetryLifecycle implements OnApplicationShutdown {
  private readonly hooks: (() => Promise<void>)[] = [];

  onShutdown(hook: () => Promise<void>): void {
    this.hooks.push(hook);
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled(this.hooks.map((hook) => hook()));
  }
}

/**
 * The per-app metrics registry, RED metrics and access log for every route,
 * and the log-context interceptor. Import it next to `HttpKitModule`.
 */
@Global()
@Module({})
export class TelemetryModule {
  static forRoot(options: { readonly service: string }): DynamicModule {
    return {
      module: TelemetryModule,
      providers: [
        {
          provide: METRICS_REGISTRY,
          useFactory: () => createMetricsRegistry(options.service),
        },
        HttpObserver,
        { provide: REQUEST_OBSERVER, useExisting: HttpObserver },
        { provide: APP_INTERCEPTOR, useClass: LogContextInterceptor },
        TelemetryLifecycle,
      ],
      exports: [METRICS_REGISTRY, REQUEST_OBSERVER, TelemetryLifecycle],
    };
  }
}
