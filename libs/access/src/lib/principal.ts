import {
  ANONYMOUS_ROLE,
  ANONYMOUS_USER_ID,
  OPERATOR_KEY_USER_ID,
  type PRINCIPAL_KINDS,
} from './constants.js';
import {
  type AnyRole,
  Permission,
  ROLE_PERMISSIONS,
  type Role,
} from './matrix.js';

export type PrincipalKind = (typeof PRINCIPAL_KINDS)[number];

export interface Principal {
  readonly kind: PrincipalKind;
  /** The token subject; stable per identity provider. */
  readonly userId: string;
  readonly orgId: string;
  readonly roles: readonly AnyRole[];
  /** OAuth scopes granted to the client, as presented. */
  readonly scopes: readonly string[];
  /** Effective permissions after scope narrowing; the only input to `can`. */
  readonly permissions: readonly Permission[];
  readonly displayName?: string;
  readonly orgName?: string;
}

const isPermission = (scope: string): scope is Permission =>
  Permission.safeParse(scope).success;

/**
 * Union of role permissions. When the token's scopes name any MatchIQ
 * permission, the result is narrowed to those scopes: a client can
 * down-scope a user but never add to what the roles grant.
 */
export const effectivePermissions = (
  roles: readonly AnyRole[],
  scopes: readonly string[] = [],
): Permission[] => {
  const granted = new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]));
  const requested = scopes.filter(isPermission);
  const allowed =
    requested.length === 0
      ? [...granted]
      : requested.filter((p) => granted.has(p));
  return Permission.options.filter((p) => allowed.includes(p));
};

export const can = (
  principal: Pick<Principal, 'permissions'> | null | undefined,
  permission: Permission,
): boolean => principal?.permissions.includes(permission) ?? false;

export const buildPrincipal = (
  input: Omit<Principal, 'permissions'>,
): Principal => ({
  ...input,
  permissions: effectivePermissions(input.roles, input.scopes),
});

/** The public demo principal (ADR-0015); its organisation comes from configuration. */
export const anonymousPrincipal = (orgId: string): Principal =>
  buildPrincipal({
    kind: 'anonymous',
    userId: ANONYMOUS_USER_ID,
    orgId,
    roles: [ANONYMOUS_ROLE],
    scopes: [],
  });

const OPERATOR_KEY_ROLES: readonly Role[] = ['developer', 'producer'];

/** The dev/CI operator-key fallback, off unless explicitly enabled. */
export const operatorKeyPrincipal = (orgId: string): Principal =>
  buildPrincipal({
    kind: 'operator-key',
    userId: OPERATOR_KEY_USER_ID,
    orgId,
    roles: OPERATOR_KEY_ROLES,
    scopes: [],
  });
