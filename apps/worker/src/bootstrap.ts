import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { WorkerEnv } from '@matchiq/config';
import {
  configureHttpApp,
  createNestLogger,
  startObservability,
} from '@matchiq/server-kit';
import type { TracingHandle } from '@matchiq/server-kit/tracing';
import { AppModule } from './app/app.module';
import { SERVICE_NAME } from './app/constants';

export const bootstrap = async (
  env: WorkerEnv,
  tracing: TracingHandle,
): Promise<void> => {
  const app = await NestFactory.create(AppModule.forRoot(env), {
    logger: createNestLogger(env, SERVICE_NAME),
  });
  configureHttpApp(app, { corsOrigins: [] });
  await app.listen(env.WORKER_PORT);
  await startObservability(app, env, tracing);
  Logger.log(
    `${SERVICE_NAME} listening on port ${env.WORKER_PORT}`,
    'Bootstrap',
  );
};
