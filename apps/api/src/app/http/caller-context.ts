import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Principal } from '@matchiq/access';
import { type AuthenticatedRequest, principalOf } from '@matchiq/auth';
import { requestIdOf } from '@matchiq/server-kit';
import { HEADERS } from '../constants';
import { parseIdempotencyKey } from './idempotency';

/** The authenticated caller plus the write headers every command carries. */
export interface CallerContext {
  readonly principal: Principal;
  readonly idempotencyKey?: string;
  readonly requestId?: string;
}

export const callerContextOf = (req: AuthenticatedRequest): CallerContext => {
  const idempotencyKey = parseIdempotencyKey(
    req.header(HEADERS.idempotencyKey),
  );
  const requestId = requestIdOf(req);
  return {
    principal: principalOf(req),
    ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    ...(requestId === undefined ? {} : { requestId }),
  };
};

/** Guards run first, so an unauthenticated call never reaches here. */
export const Caller = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CallerContext =>
    callerContextOf(context.switchToHttp().getRequest<AuthenticatedRequest>()),
);
