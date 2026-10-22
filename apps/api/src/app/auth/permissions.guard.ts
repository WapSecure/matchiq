import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AuthenticatedRequest, principalOf } from '@matchiq/auth';
import type { Request } from 'express';
import { type Actor, actorFromPrincipal } from './actor';

/**
 * One permission system (ADR-0015): `RequirePermission` is the global
 * guards' declaration from `@matchiq/auth`; this module only adapts the
 * authenticated principal to the editorial `Actor`.
 */
export { RequirePermission } from '@matchiq/auth';

export const actorOf = (request: Request): Actor =>
  actorFromPrincipal(principalOf(request as AuthenticatedRequest));

export const CurrentActor = createParamDecorator(
  (_: unknown, context: ExecutionContext): Actor =>
    actorOf(context.switchToHttp().getRequest<Request>()),
);
