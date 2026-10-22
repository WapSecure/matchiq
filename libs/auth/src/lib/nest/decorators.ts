import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Permission, Principal } from '@matchiq/access';
import type { Request } from 'express';
import { METADATA, PRINCIPAL_PROPERTY } from '../constants';

export type AuthenticatedRequest = Request & {
  [PRINCIPAL_PROPERTY]?: Principal;
};

/** Every non-public route declares exactly one permission (ADR-0015). */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(METADATA.permission, permission);

/** Lets the route authenticate with `?ticket=` bound to this path parameter. */
export const AcceptsStreamTicket = (fixtureParam: string) =>
  SetMetadata(METADATA.streamTicket, fixtureParam);

export const principalOf = (request: AuthenticatedRequest): Principal => {
  const principal = request[PRINCIPAL_PROPERTY];
  // Reaching a handler without one means the guard was not installed.
  if (principal === undefined) throw new Error('No authenticated principal');
  return principal;
};

/** The authenticated caller; the only source of `orgId` for services. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    principalOf(context.switchToHttp().getRequest<AuthenticatedRequest>()),
);
