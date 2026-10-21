import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { API_GLOBAL_PREFIX } from '../constants';
import { ProblemDetailsFilter } from '../http/problem-details.filter';

export interface HttpAppOptions {
  readonly corsOrigins: readonly string[];
  readonly globalPrefix?: string;
}

/** Applies the security and error-handling baseline shared by every MatchIQ HTTP service. */
export const configureHttpApp = (
  app: INestApplication,
  options: HttpAppOptions,
): void => {
  app.use(helmet());
  app.setGlobalPrefix(options.globalPrefix ?? API_GLOBAL_PREFIX);
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableCors({
    origin: options.corsOrigins.length > 0 ? [...options.corsOrigins] : false,
    credentials: false,
  });
  app.enableShutdownHooks();
};
