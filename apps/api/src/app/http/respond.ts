import type { Response } from 'express';
import { HEADERS } from '../constants';
import type { IdempotentResult } from './idempotency';

/** Applies an idempotent result's status and replay marker, returning its body. */
export const respond = <T>(res: Response, result: IdempotentResult<T>): T => {
  res.status(result.status);
  if (result.replayed) res.setHeader(HEADERS.idempotentReplay, 'true');
  return result.body;
};
