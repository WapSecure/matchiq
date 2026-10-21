import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ApiEnv, loadEnv } from '@matchiq/config';
import { AppModule } from './app/app.module';
import { configureApiApp } from './app/configure-api-app';
import { SERVICE_NAME } from './app/constants';

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(ApiEnv);
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.forRoot(env),
    {
      logger: [
        env.LOG_LEVEL === 'debug' ? 'debug' : 'log',
        'warn',
        'error',
        'fatal',
      ],
    },
  );
  configureApiApp(app, env);
  await app.listen(env.API_PORT);
  Logger.log(`${SERVICE_NAME} listening on port ${env.API_PORT}`, 'Bootstrap');
};

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
