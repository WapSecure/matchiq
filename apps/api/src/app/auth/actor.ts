import type { Permission, Principal } from '@matchiq/access';
import type { AuditActorType } from '@matchiq/contracts';

/** Who is calling, as editorial services and audit rows see it (ADR-0018, ADR-0016). */
export interface Actor {
  readonly type: AuditActorType;
  readonly id: string;
  /** From the identity provider's name claim; audit rows record it. */
  readonly displayName?: string;
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

/** Spread into an audit entry: the actor's display name, when it has one. */
export const auditNameOf = (actor: {
  readonly displayName?: string;
}): { actorDisplayName?: string } =>
  actor.displayName === undefined
    ? {}
    : { actorDisplayName: actor.displayName };

/** The OIDC principal (or the dev/CI key, or the anonymous demo) as an actor. */
export const actorFromPrincipal = (principal: Principal): Actor => ({
  type: actorTypeOf(principal),
  id: principal.userId,
  ...(principal.displayName === undefined
    ? {}
    : { displayName: principal.displayName }),
  orgId: principal.orgId,
  permissions: new Set(principal.permissions),
});
