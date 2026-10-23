import type { Permission, Principal } from '@matchiq/access';
import type { AuditActorType } from '@matchiq/contracts';

/** Who is calling, as editorial services and audit rows see it (ADR-0018, ADR-0016). */
export interface Actor {
  readonly type: AuditActorType;
  readonly id: string;
  readonly orgId: string;
  readonly permissions: ReadonlySet<Permission>;
}

const ACTOR_TYPES: Readonly<Record<Principal['kind'], AuditActorType>> = {
  user: 'USER',
  service: 'SERVICE',
  'operator-key': 'OPERATOR',
  anonymous: 'ANONYMOUS',
};

export const actorTypeOf = (principal: Principal): AuditActorType =>
  ACTOR_TYPES[principal.kind];

/** The OIDC principal (or the dev/CI key, or the anonymous demo) as an actor. */
export const actorFromPrincipal = (principal: Principal): Actor => ({
  type: actorTypeOf(principal),
  id: principal.userId,
  orgId: principal.orgId,
  permissions: new Set(principal.permissions),
});
