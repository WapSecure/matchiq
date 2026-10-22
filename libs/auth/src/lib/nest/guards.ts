import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, type Permission, type Principal } from '@matchiq/access';
import { PUBLIC_ROUTE_METADATA, requestIdOf } from '@matchiq/server-kit';
import { AuthUnavailableError } from '../access-token-verifier';
import { Authenticator, type Credentials } from '../authenticator';
import {
  HEADERS,
  METADATA,
  PRINCIPAL_PROPERTY,
  STREAM_TICKET,
} from '../constants';
import { type AuthenticatedRequest, principalOf } from './decorators';
import {
  authUnavailableProblem,
  forbiddenProblem,
  unauthorizedProblem,
  undeclaredRouteProblem,
} from './problems';
import { ACCESS_DENIED_LISTENER, AUTHENTICATOR } from './tokens';

export interface AccessDenial {
  readonly principal: Principal;
  readonly permission: Permission;
  readonly method: string;
  readonly path: string;
  readonly requestId?: string;
}

/** Receives every 403 for an authenticated caller, e.g. to audit it. */
export interface AccessDeniedListener {
  onDenied(denial: AccessDenial): void;
}

const metadata = <T>(
  reflector: Reflector,
  key: string,
  context: ExecutionContext,
): T | undefined =>
  reflector.getAllAndOverride<T>(key, [
    context.getHandler(),
    context.getClass(),
  ]);

const isPublic = (reflector: Reflector, context: ExecutionContext): boolean =>
  metadata<boolean>(reflector, PUBLIC_ROUTE_METADATA, context) === true;

const credentialsOf = (
  request: AuthenticatedRequest,
  ticketParam: string | undefined,
): Credentials => {
  const authorization = request.header(HEADERS.authorization);
  const ticket = request.query[STREAM_TICKET.queryParam];
  const fixtureId = ticketParam ? request.params[ticketParam] : undefined;
  return {
    ...(authorization === undefined ? {} : { authorization }),
    ...(typeof ticket === 'string' && typeof fixtureId === 'string'
      ? { streamTicket: { ticket, fixtureId } }
      : {}),
  };
};

/** Resolves the principal for every non-public route; runs before throttling. */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(AUTHENTICATOR) private readonly authenticator: Authenticator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (isPublic(this.reflector, context)) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ticketParam = metadata<string>(
      this.reflector,
      METADATA.streamTicket,
      context,
    );
    let result;
    try {
      result = await this.authenticator.authenticate(
        credentialsOf(request, ticketParam),
      );
    } catch (error) {
      if (error instanceof AuthUnavailableError) throw authUnavailableProblem();
      throw error;
    }
    if (!result.ok) throw unauthorizedProblem(result.reason);
    request[PRINCIPAL_PROPERTY] = result.principal;
    return true;
  }
}

/** Deny by default: a route without `@RequirePermission` is refused. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(ACCESS_DENIED_LISTENER)
    private readonly listener?: AccessDeniedListener,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (isPublic(this.reflector, context)) return true;
    const permission = metadata<Permission>(
      this.reflector,
      METADATA.permission,
      context,
    );
    if (permission === undefined) throw undeclaredRouteProblem();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = principalOf(request);
    if (can(principal, permission)) return true;
    this.listener?.onDenied({
      principal,
      permission,
      method: request.method,
      path: request.path,
      requestId: requestIdOf(request),
    });
    throw forbiddenProblem(permission);
  }
}
