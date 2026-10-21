import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerEnv, loadEnv } from '@matchiq/config';
import { configureHttpApp } from '@matchiq/server-kit';
import { AppModule } from './app/app.module';
import { SERVICE_NAME } from './app/constants';

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(WorkerEnv);
  const app = await NestFactory.create(AppModule.forRoot(env));
  configureHttpApp(app, { corsOrigins: [] });
  await app.listen(env.WORKER_PORT);
  Logger.log(
    `${SERVICE_NAME} listening on port ${env.WORKER_PORT}`,
    'Bootstrap',
  );
};

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
