import type { LoggerService, LogLevel as NestLogLevel } from '@nestjs/common';
import { type DestinationStream, type Logger, pino } from 'pino';
import { currentLogContext } from './log-context';
import { prettyDestination } from './pretty-stream';
import { redact, scrubText } from './redaction';
import { LOG_FIELDS, LOG_LEVELS } from './telemetry.constants';
import { activeTraceFields } from './trace-context';

export type ServiceLogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'trace';

export interface ServiceLoggerOptions {
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly level: ServiceLogLevel;
  readonly format: 'json' | 'pretty';
  /** Defaults to stdout; tests pass a capturing stream. */
  readonly destination?: DestinationStream;
}

/**
 * The pino logger behind every service: JSON lines carrying the request,
 * correlation, org, fixture and trace ids of the current unit of work, with
 * secrets redacted from fields and messages.
 */
export const createServiceLogger = (options: ServiceLoggerOptions): Logger =>
  pino(
    {
      level: options.level,
      base: {
        service: options.service,
        version: options.version,
        env: options.environment,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
        log: (fields) => redact(fields),
      },
      mixin: () => ({ ...currentLogContext(), ...activeTraceFields() }),
      hooks: {
        logMethod(args, method) {
          const scrubbed = args.map((a) =>
            typeof a === 'string' ? scrubText(a) : a,
          ) as Parameters<typeof method>;
          method.apply(this, scrubbed);
        },
      },
    },
    options.destination ??
      (options.format === 'pretty' ? prettyDestination() : undefined),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Adapts Nest's `LoggerService` to pino, so every `new Logger(Context)` in app
 * code writes structured lines without changing call sites.
 */
export class PinoLoggerService implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, ...params: unknown[]): void {
    this.write('log', message, params);
  }
  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }
  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }
  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    this.write('verbose', message, params);
  }
  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  setLogLevels(levels: NestLogLevel[]): void {
    const order: NestLogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error'];
    const lowest = order.find((l) => levels.includes(l));
    if (lowest) this.logger.level = LOG_LEVELS[lowest];
  }

  private write(level: NestLogLevel, message: unknown, params: unknown[]): void {
    const rest = [...params];
    // Nest appends the context name as the last argument.
    const context =
      typeof rest.at(-1) === 'string' && rest.length > 0
        ? (rest.pop() as string)
        : undefined;
    const fields: Record<string, unknown> = {};
    if (context !== undefined) fields[LOG_FIELDS.context] = context;
    if (level === 'error' && typeof rest[0] === 'string') {
      fields[LOG_FIELDS.stack] = rest.shift();
    }
    for (const extra of rest) {
      if (isRecord(extra)) Object.assign(fields, extra);
    }
    const target = this.logger[LOG_LEVELS[level]].bind(this.logger);
    if (isRecord(message)) target({ ...fields, ...message });
    else if (message instanceof Error) {
      target({ ...fields, err: message, stack: message.stack }, message.message);
    } else target(fields, String(message));
  }
}
