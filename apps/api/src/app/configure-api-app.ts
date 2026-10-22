import type { ApiEnv } from '@matchiq/config';
import { configureHttpApp } from '@matchiq/server-kit';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { API_LIMITS } from './constants';

/** The shared HTTP baseline plus API-specific body limits; used by main and tests. */
export const configureApiApp = (
  app: NestExpressApplication,
  env: ApiEnv,
): void => {
  app.useBodyParser('json', { limit: API_LIMITS.jsonBodyLimit });
  configureHttpApp(app, {
    corsOrigins: env.CORS_ALLOWED_ORIGINS,
    trustProxy: env.TRUST_PROXY,
  });
};
