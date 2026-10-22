import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { API_GLOBAL_PREFIX, EXPRESS_SETTINGS } from '../constants';
import { ProblemDetailsFilter } from '../http/problem-details.filter';

export interface HttpAppOptions {
  readonly corsOrigins: readonly string[];
  readonly globalPrefix?: string;
  /**
   * Express `trust proxy`: a hop count or trusted proxy addresses. Behind a
   * reverse proxy it makes `req.ip` (rate limiting, logs) the real client.
   */
  readonly trustProxy?: false | number | readonly string[];
}

interface ExpressSettings {
  set(setting: string, value: unknown): void;
}

/** Applies the security and error-handling baseline shared by every MatchIQ HTTP service. */
export const configureHttpApp = (
  app: INestApplication,
  options: HttpAppOptions,
): void => {
  const trustProxy = options.trustProxy ?? false;
  const express = app.getHttpAdapter().getInstance() as ExpressSettings;
  express.set(
    EXPRESS_SETTINGS.trustProxy,
    Array.isArray(trustProxy) ? [...trustProxy] : trustProxy,
  );
  app.use(helmet());
  app.setGlobalPrefix(options.globalPrefix ?? API_GLOBAL_PREFIX);
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableCors({
    origin: options.corsOrigins.length > 0 ? [...options.corsOrigins] : false,
    credentials: false,
  });
  app.enableShutdownHooks();
};
