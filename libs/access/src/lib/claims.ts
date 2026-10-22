import {
  CLAIM_ERRORS,
  CLAIM_PATH_SEPARATOR,
  ENTRA_APP_ID_TYPE,
  ORG_ID_PATTERN,
  SCOPE_SEPARATOR,
  SERVICE_CLAIMS,
  STANDARD_CLAIMS,
} from './constants.js';
import { Role } from './matrix.js';
import { buildPrincipal, type Principal } from './principal.js';

/** Claim names differ per identity provider; see docs/security/IDENTITY_AND_ACCESS.md. */
export interface ClaimMapping {
  readonly orgClaim: string;
  readonly rolesClaim: string;
  readonly nameClaim: string;
  readonly orgNameClaim?: string;
}

export type ClaimError = (typeof CLAIM_ERRORS)[keyof typeof CLAIM_ERRORS];

export type ClaimResult =
  | { readonly ok: true; readonly principal: Principal }
  | { readonly ok: false; readonly reason: ClaimError };

type Claims = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A literal key wins over a dotted path, because Entra extension claims
 * (`extn.org`) contain dots while Keycloak nests (`realm_access.roles`).
 */
export const readClaim = (claims: Claims, name: string): unknown => {
  if (name in claims) return claims[name];
  let current: unknown = claims;
  for (const part of name.split(CLAIM_PATH_SEPARATOR)) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }
  return current;
};

const asStrings = (value: unknown): string[] => {
  if (typeof value === 'string')
    return value.split(SCOPE_SEPARATOR).filter(Boolean);
  if (Array.isArray(value))
    return value.filter((v): v is string => typeof v === 'string');
  return [];
};

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/** A single organisation per token; several (or none) is not a tenant. */
const orgOf = (value: unknown): string | null => {
  const values = asStrings(value);
  if (values.length !== 1) return null;
  const [org] = values;
  return org !== undefined && ORG_ID_PATTERN.test(org) ? org : null;
};

const isService = (claims: Claims): boolean =>
  typeof claims[SERVICE_CLAIMS.keycloak] === 'string' ||
  claims[SERVICE_CLAIMS.entraIdType] === ENTRA_APP_ID_TYPE;

/** Maps verified token claims to a principal; unknown roles are ignored. */
export const principalFromClaims = (
  claims: Claims,
  mapping: ClaimMapping,
): ClaimResult => {
  const userId = asText(claims[STANDARD_CLAIMS.subject]);
  if (userId === undefined) return { ok: false, reason: CLAIM_ERRORS.subject };
  const orgId = orgOf(readClaim(claims, mapping.orgClaim));
  if (orgId === null) return { ok: false, reason: CLAIM_ERRORS.org };
  const roles = [
    ...new Set(
      asStrings(readClaim(claims, mapping.rolesClaim)).filter(
        (r) => Role.safeParse(r).success,
      ),
    ),
  ] as Role[];
  if (roles.length === 0) return { ok: false, reason: CLAIM_ERRORS.roles };
  const scopes = asStrings(
    claims[STANDARD_CLAIMS.scope] ?? claims[STANDARD_CLAIMS.scopes],
  );
  const displayName =
    asText(readClaim(claims, mapping.nameClaim)) ??
    asText(claims[STANDARD_CLAIMS.preferredUsername]);
  const orgName = mapping.orgNameClaim
    ? asText(readClaim(claims, mapping.orgNameClaim))
    : undefined;
  return {
    ok: true,
    principal: buildPrincipal({
      kind: isService(claims) ? 'service' : 'user',
      userId,
      orgId,
      roles,
      scopes,
      ...(displayName === undefined ? {} : { displayName }),
      ...(orgName === undefined ? {} : { orgName }),
    }),
  };
};
