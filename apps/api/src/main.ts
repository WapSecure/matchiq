import 'reflect-metadata';
import { ApiEnv, loadEnv } from '@matchiq/config';
import { startTracing } from '@matchiq/server-kit/tracing';
import { SERVICE_NAME } from './app/constants';

// Tracing starts before the app module graph loads, so instrumentations patch it.
const main = async (): Promise<void> => {
  const env = loadEnv(ApiEnv);
  const tracing = await startTracing({
    serviceName: env.OTEL_SERVICE_NAME ?? SERVICE_NAME,
    version: env.APP_VERSION,
    environment: env.APP_ENV,
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    azureConnectionString: env.APPLICATIONINSIGHTS_CONNECTION_STRING,
  });
  const { bootstrap } = await import('./bootstrap.js');
  await bootstrap(env, tracing);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
