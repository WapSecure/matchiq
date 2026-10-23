/** Spec §40 product roles, as they appear in the identity provider's roles claim. */
export const ROLE_NAMES = [
  'platform-operator',
  'tenant-owner',
  'producer',
  'analyst',
  'developer',
  'viewer',
] as const;

/** Built in, never assignable in the identity provider (ADR-0018). */
export const ANONYMOUS_ROLE = 'anonymous';

/** Spec §45 scopes plus the product permissions they leave out. */
export const PERMISSION_NAMES = [
  'fixtures:read',
  'fixtures:write',
  'events:ingest',
  'insights:read',
  'insights:write',
  'overlays:read',
  'agents:traces:read',
  'replay:control',
  'editorial:approve',
  'editorial:publish',
  'audit:read',
  'preferences:write',
  'members:manage',
  'policy:configure',
  'billing:read',
  'platform:diagnostics',
  'platform:config',
] as const;

export const PRINCIPAL_KINDS = [
  'user',
  'service',
  'anonymous',
  'operator-key',
] as const;

export const ORG_ID_PATTERN = /^org_[A-Za-z0-9_-]{1,60}$/;
export const SCOPE_SEPARATOR = /\s+/;
export const CLAIM_PATH_SEPARATOR = '.';

export const ANONYMOUS_USER_ID = 'anonymous';
export const OPERATOR_KEY_USER_ID = 'operator-key';

/** Claims a client-credentials token carries instead of a person's username. */
export const SERVICE_CLAIMS = { keycloak: 'client_id', entraIdType: 'idtyp' };
export const ENTRA_APP_ID_TYPE = 'app';

export const STANDARD_CLAIMS = {
  subject: 'sub',
  scope: 'scope',
  scopes: 'scp',
  preferredUsername: 'preferred_username',
} as const;

export const CLAIM_ERRORS = {
  subject: 'missing-subject',
  org: 'missing-or-invalid-org',
  roles: 'no-known-role',
} as const;
