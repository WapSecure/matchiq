import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, REQUEST_ID_PATTERN } from '../constants';

/** Accepts a well-formed inbound request id or issues a new one, and echoes it. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const inbound = req.header(REQUEST_ID_HEADER);
    const requestId =
      inbound && REQUEST_ID_PATTERN.test(inbound) ? inbound : randomUUID();
    req.headers[REQUEST_ID_HEADER] = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}

export const requestIdOf = (req: Request): string | undefined =>
  req.header(REQUEST_ID_HEADER);
