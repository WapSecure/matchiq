import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  type NestMiddleware,
  Optional,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, REQUEST_ID_PATTERN } from '../constants';
import {
  REQUEST_OBSERVER,
  type RequestObserver,
} from '../telemetry/http-observer';
import { withLogContext } from '../telemetry/log-context';
import { CORRELATION_ID_HEADER } from '../telemetry/telemetry.constants';

const wellFormed = (value: string | undefined): string | undefined =>
  value && REQUEST_ID_PATTERN.test(value) ? value : undefined;

/**
 * Accepts a well-formed inbound request id or issues a new one, echoes it, and
 * runs the rest of the request inside a log context carrying it (and the
 * caller's correlation id, defaulting to the request id).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    @Optional()
    @Inject(REQUEST_OBSERVER)
    private readonly observer?: RequestObserver,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = wellFormed(req.header(REQUEST_ID_HEADER)) ?? randomUUID();
    const correlationId =
      wellFormed(req.header(CORRELATION_ID_HEADER)) ?? requestId;
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    const observer = this.observer;
    withLogContext({ requestId, correlationId }, () => {
      if (observer) {
        const started = performance.now();
        res.once('finish', () =>
          observer.finished(req, res, performance.now() - started),
        );
        res.once('close', () => {
          if (!res.writableFinished)
            observer.finished(req, res, performance.now() - started);
        });
      }
      next();
    });
  }
}

export const requestIdOf = (req: Request): string | undefined =>
  req.header(REQUEST_ID_HEADER);
