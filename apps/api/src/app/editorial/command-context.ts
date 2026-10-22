import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { EditorialCommand } from '@matchiq/contracts';
import { REQUEST_ID_PATTERN, ZodValidationPipe } from '@matchiq/server-kit';
import type { Request } from 'express';
import { actorOf } from '../auth/permissions.guard';
import { HEADERS } from '../constants';
import { parseIdempotencyKey } from '../http/idempotency';
import type { CommandContext } from './editorial-writes';

const commandPipe = new ZodValidationPipe(EditorialCommand);

export const commandContextOf = (req: Request): CommandContext => {
  const command = commandPipe.transform(req.body);
  const requestId = req.header(HEADERS.requestId);
  const correlation = req.header(HEADERS.correlationId);
  return {
    actor: actorOf(req),
    reason: command.reason,
    requestId,
    correlationId:
      correlation && REQUEST_ID_PATTERN.test(correlation)
        ? correlation
        : requestId,
    idempotencyKey: parseIdempotencyKey(req.header(HEADERS.idempotencyKey)),
  };
};

/**
 * The admitted actor, the validated `{ reason }` body and the request,
 * correlation and idempotency headers of an editorial command. Guards run
 * first, so an unauthenticated call never reaches body validation.
 */
export const EditorialContext = createParamDecorator(
  (_: unknown, context: ExecutionContext): CommandContext =>
    commandContextOf(context.switchToHttp().getRequest<Request>()),
);
