import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiEnv, loadEnv } from '@matchiq/config';
import { configureHttpApp } from '@matchiq/server-kit';
import { AppModule } from './app/app.module';
import { SERVICE_NAME } from './app/constants';

const bootstrap = async (): Promise<void> => {
  const env = loadEnv(ApiEnv);
  const app = await NestFactory.create(AppModule.forRoot(env), {
    logger: [
      env.LOG_LEVEL === 'debug' ? 'debug' : 'log',
      'warn',
      'error',
      'fatal',
    ],
  });
  configureHttpApp(app, { corsOrigins: env.CORS_ALLOWED_ORIGINS });
  await app.listen(env.API_PORT);
  Logger.log(`${SERVICE_NAME} listening on port ${env.API_PORT}`, 'Bootstrap');
};

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
