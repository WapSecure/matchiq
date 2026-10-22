import {
  type ClaimMapping,
  principalFromClaims,
  readClaim,
} from '../src/index.js';

const KEYCLOAK: ClaimMapping = {
  orgClaim: 'org',
  rolesClaim: 'roles',
  nameClaim: 'name',
  orgNameClaim: 'org_name',
};

const base = {
  sub: 'user-1',
  org: 'org_harbour',
  org_name: 'Harbour Media',
  roles: ['producer', 'offline_access'],
  name: 'Pat Producer',
  scope: 'openid profile',
};

describe('principalFromClaims', () => {
  it('maps Keycloak-style claims and ignores unknown roles', () => {
    const result = principalFromClaims(base, KEYCLOAK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.principal).toMatchObject({
      kind: 'user',
      userId: 'user-1',
      orgId: 'org_harbour',
      orgName: 'Harbour Media',
      roles: ['producer'],
      displayName: 'Pat Producer',
      scopes: ['openid', 'profile'],
    });
    expect(result.principal.permissions).toContain('editorial:publish');
  });

  it('reads Entra-style claims: dotted extension names and app roles', () => {
    const result = principalFromClaims(
      {
        sub: 'oid-9',
        'extn.org': 'org_northbank',
        roles: ['viewer'],
        scp: 'fixtures:read',
      },
      { orgClaim: 'extn.org', rolesClaim: 'roles', nameClaim: 'name' },
    );
    expect(result.ok && result.principal.permissions).toEqual([
      'fixtures:read',
    ]);
  });

  it('follows nested paths when no literal key exists', () => {
    expect(
      readClaim({ realm_access: { roles: ['viewer'] } }, 'realm_access.roles'),
    ).toEqual(['viewer']);
    expect(readClaim({ a: 'x' }, 'a.b')).toBeUndefined();
  });

  it.each([
    ['no subject', { ...base, sub: '' }, 'missing-subject'],
    ['no organisation', { ...base, org: undefined }, 'missing-or-invalid-org'],
    [
      'two organisations',
      { ...base, org: ['org_a', 'org_b'] },
      'missing-or-invalid-org',
    ],
    [
      'a malformed organisation',
      { ...base, org: 'harbour; drop' },
      'missing-or-invalid-org',
    ],
    [
      'no known role',
      { ...base, roles: ['admin', 'superuser'] },
      'no-known-role',
    ],
    [
      'roles that are not strings',
      { ...base, roles: [1, true] },
      'no-known-role',
    ],
  ])('rejects %s', (_label, claims, reason) => {
    expect(principalFromClaims(claims, KEYCLOAK)).toEqual({
      ok: false,
      reason,
    });
  });

  it('accepts a single-element organisation array (Keycloak organisations)', () => {
    const result = principalFromClaims({ ...base, org: ['org_a'] }, KEYCLOAK);
    expect(result.ok && result.principal.orgId).toBe('org_a');
  });

  it('marks client-credentials tokens as service principals', () => {
    const result = principalFromClaims(
      { ...base, client_id: 'ingest-bot' },
      KEYCLOAK,
    );
    expect(result.ok && result.principal.kind).toBe('service');
  });

  it('falls back to preferred_username for the display name', () => {
    const result = principalFromClaims(
      { ...base, name: undefined, preferred_username: 'pat' },
      KEYCLOAK,
    );
    expect(result.ok && result.principal.displayName).toBe('pat');
  });
});
