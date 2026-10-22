import { Inject, Injectable } from '@nestjs/common';
import type { ApiEnv } from '@matchiq/config';
import { Permission, type AuditActorType } from '@matchiq/contracts';
import { APP_ENV } from '@matchiq/server-kit';
import { AUTH, HEADERS } from '../constants';
import { operatorKeyMatches } from './operator-auth.guard';

/** Who is calling. Controllers and services only ever see this, never credentials. */
export interface Actor {
  readonly type: AuditActorType;
  readonly id: string;
  readonly orgId: string;
  readonly permissions: ReadonlySet<Permission>;
}

export type ActorResolution =
  | { readonly kind: 'anonymous' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'actor'; readonly actor: Actor };

/**
 * The seam real identity replaces (ADR-0016): an OIDC resolver validates a
 * token and maps memberships to permissions; guards and controllers stay as
 * they are.
 */
export interface ActorResolver {
  resolve(headers: {
    header(name: string): string | undefined;
  }): ActorResolution;
}

export const ACTOR_RESOLVER = Symbol('ACTOR_RESOLVER');

/** ADR-0010: the shared operator key stands for one operator with every permission. */
@Injectable()
export class OperatorKeyActorResolver implements ActorResolver {
  private readonly operator: Actor;

  constructor(@Inject(APP_ENV) private readonly env: ApiEnv) {
    this.operator = {
      type: 'OPERATOR',
      id: AUTH.operatorActor,
      orgId: env.DEMO_ORG_ID,
      permissions: new Set(Permission.options),
    };
  }

  resolve(request: {
    header(name: string): string | undefined;
  }): ActorResolution {
    const header = request.header(HEADERS.authorization);
    if (!header?.startsWith(AUTH.bearerPrefix)) return { kind: 'anonymous' };
    const token = header.slice(AUTH.bearerPrefix.length).trim();
    return operatorKeyMatches(token, this.env.OPERATOR_API_KEY)
      ? { kind: 'actor', actor: this.operator }
      : { kind: 'invalid' };
  }
}
