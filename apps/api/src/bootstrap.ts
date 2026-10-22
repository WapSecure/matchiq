import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ApiEnv } from '@matchiq/config';
import { createNestLogger, startObservability } from '@matchiq/server-kit';
import type { TracingHandle } from '@matchiq/server-kit/tracing';
import { AppModule } from './app/app.module';
import { configureApiApp } from './app/configure-api-app';
import { SERVICE_NAME } from './app/constants';

export const bootstrap = async (
  env: ApiEnv,
  tracing: TracingHandle,
): Promise<void> => {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    { logger: createNestLogger(env, SERVICE_NAME) },
  );
  configureApiApp(app, env);
  await app.listen(env.API_PORT);
  await startObservability(app, env, tracing);
  Logger.log(`${SERVICE_NAME} listening on port ${env.API_PORT}`, 'Bootstrap');
};
