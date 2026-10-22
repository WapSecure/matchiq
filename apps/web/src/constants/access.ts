import type { Permission } from '@matchiq/access';

/**
 * `operator-key`: no signed-in principal reaches the browser yet (ADR-0015
 * web sign-in is a separate stage), so controls are offered and the API's
 * 401/403 problems are the authority. `principal` denies until the identity
 * provider mounts `PermissionsProvider` with the session's permissions.
 */
export type AccessMode = 'operator-key' | 'principal';

export const ACCESS_MODE: AccessMode = 'operator-key';

const DENIED: Partial<Record<Permission, string>> = {
  'editorial:publish':
    'Requires the producer role (editorial:publish). Ask a tenant owner for access.',
  'editorial:approve':
    'Requires the producer role (editorial:approve). Ask a tenant owner for access.',
  'audit:read':
    'Requires the audit:read permission, held by producers and tenant owners.',
};

const DENIED_FALLBACK = 'Your role does not include this action.';

export const deniedReason = (permission: Permission): string =>
  DENIED[permission] ?? DENIED_FALLBACK;
