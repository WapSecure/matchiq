import {
  applyDecorators,
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@matchiq/access';
import { ProblemException } from '@matchiq/server-kit';
import type { Request } from 'express';
import { AUTH, AUTH_DETAILS, HEADERS, PROBLEMS } from '../constants';
import { ACTOR_RESOLVER, type Actor, type ActorResolver } from './actor';

const PERMISSION_KEY = 'matchiq:permission';

type ActorRequest = Request & { matchiqActor?: Actor };

const unauthorized = (detail: string): ProblemException =>
  new ProblemException({
    status: HttpStatus.UNAUTHORIZED,
    ...PROBLEMS.unauthorized,
    detail,
    headers: { [HEADERS.wwwAuthenticate]: AUTH.challenge },
  });

/** Deny by default: 401 without valid credentials, 403 without the permission. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACTOR_RESOLVER) private readonly resolver: ActorResolver,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<Permission | undefined>(
      PERMISSION_KEY,
      context.getHandler(),
    );
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const resolution = this.resolver.resolve(request);
    if (resolution.kind === 'anonymous') {
      throw unauthorized(AUTH_DETAILS.missing);
    }
    if (resolution.kind === 'invalid') throw unauthorized(AUTH_DETAILS.invalid);
    if (required === undefined || !resolution.actor.permissions.has(required)) {
      throw new ProblemException({
        status: HttpStatus.FORBIDDEN,
        ...PROBLEMS.forbidden,
        detail: AUTH_DETAILS.missingPermission(required ?? '?'),
      });
    }
    request.matchiqActor = resolution.actor;
    return true;
  }
}

export const RequirePermission = (permission: Permission) =>
  applyDecorators(
    SetMetadata(PERMISSION_KEY, permission),
    UseGuards(PermissionsGuard),
  );

/** The actor admitted by `PermissionsGuard`; only valid on guarded routes. */
export const actorOf = (request: Request): Actor => {
  const actor = (request as ActorRequest).matchiqActor;
  if (actor === undefined) throw unauthorized(AUTH_DETAILS.missing);
  return actor;
};

export const CurrentActor = createParamDecorator(
  (_: unknown, context: ExecutionContext): Actor =>
    actorOf(context.switchToHttp().getRequest<Request>()),
);
