import { type INestApplication, Logger } from '@nestjs/common';
import { METRICS_REGISTRY, type Registry, startMetricsServer } from './metrics';
import { METRICS_LOG } from './telemetry.constants';
import { TelemetryLifecycle } from './telemetry.module';
import type { TracingHandle } from './tracing';

export interface ObservabilityEnv {
  readonly METRICS_HOST: string;
  /** 0 disables the listener. */
  readonly METRICS_PORT: number;
}

/**
 * Starts the internal metrics listener and ties it, and the trace exporter,
 * to the app's shutdown. Call after `app.listen`.
 */
export const startObservability = async (
  app: INestApplication,
  env: ObservabilityEnv,
  tracing: TracingHandle,
): Promise<void> => {
  const lifecycle = app.get(TelemetryLifecycle);
  lifecycle.onShutdown(() => tracing.shutdown());
  if (tracing.notice) Logger.log(tracing.notice, METRICS_LOG.tracingContext);
  if (env.METRICS_PORT === 0) return;
  const server = await startMetricsServer(app.get<Registry>(METRICS_REGISTRY), {
    host: env.METRICS_HOST,
    port: env.METRICS_PORT,
  });
  lifecycle.onShutdown(() => server.close());
  Logger.log(
    METRICS_LOG.listening(env.METRICS_HOST, server.port),
    METRICS_LOG.context,
  );
};
