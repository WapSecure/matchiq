import {
  createServiceLogger,
  PinoLoggerService,
  type ServiceLogLevel,
} from './service-logger';

/** The subset of the validated common environment that shapes logging. */
export interface LoggingEnv {
  readonly APP_ENV: string;
  readonly APP_VERSION: string;
  readonly LOG_LEVEL: ServiceLogLevel;
  readonly LOG_FORMAT?: 'json' | 'pretty' | undefined;
}

export const resolveLogFormat = (env: LoggingEnv): 'json' | 'pretty' =>
  env.LOG_FORMAT ?? (env.APP_ENV === 'local' ? 'pretty' : 'json');

/** Pass to `NestFactory.create(..., { logger })`; every Nest `Logger` then writes through it. */
export const createNestLogger = (
  env: LoggingEnv,
  service: string,
): PinoLoggerService =>
  new PinoLoggerService(
    createServiceLogger({
      service,
      version: env.APP_VERSION,
      environment: env.APP_ENV,
      level: env.LOG_LEVEL,
      format: resolveLogFormat(env),
    }),
  );
