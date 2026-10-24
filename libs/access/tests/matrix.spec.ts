import {
  ANONYMOUS_ROLE,
  type AnyRole,
  anonymousPrincipal,
  buildPrincipal,
  can,
  effectivePermissions,
  operatorKeyPrincipal,
  Permission,
  ROLE_PERMISSIONS,
  Role,
  rolesGranting,
} from '../src/index.js';

const allowed = (role: AnyRole) => new Set(ROLE_PERMISSIONS[role]);

describe('role → permission matrix (spec §40)', () => {
  it('covers every role, including the built-in anonymous role', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(
      [...Role.options, ANONYMOUS_ROLE].sort(),
    );
  });

  it('names only known permissions, each once per role', () => {
    for (const permissions of Object.values(ROLE_PERMISSIONS)) {
      expect(new Set(permissions).size).toBe(permissions.length);
      for (const p of permissions)
        expect(Permission.safeParse(p).success).toBe(true);
    }
  });

  it('gives the platform operator no tenant data and no editorial rights', () => {
    const operator = allowed('platform-operator');
    for (const p of [
      'fixtures:read',
      'insights:read',
      'audit:read',
      'editorial:publish',
      'editorial:approve',
    ] as const)
      expect(operator.has(p)).toBe(false);
  });

  it('lets only producers approve and publish', () => {
    expect(rolesGranting('editorial:approve')).toEqual(['producer']);
    expect(rolesGranting('editorial:publish')).toEqual(['producer']);
  });

  it('lets producers and tenant owners set a session publish policy (ADR-0024)', () => {
    expect(rolesGranting('policy:configure')).toEqual([
      'tenant-owner',
      'producer',
    ]);
  });

  it('keeps billing and members with the tenant owner; a producer cannot change billing', () => {
    expect(rolesGranting('members:manage')).toEqual(['tenant-owner']);
    expect(rolesGranting('billing:read')).toEqual(['tenant-owner']);
    expect(allowed('producer').has('billing:read')).toBe(false);
  });

  it('lets only developers create fixtures and ingest feeds', () => {
    expect(rolesGranting('fixtures:write')).toEqual(['developer']);
    expect(rolesGranting('events:ingest')).toEqual(['developer']);
  });

  it('keeps viewers to published outputs, replay controls and preferences', () => {
    expect([...allowed('viewer')].sort()).toEqual(
      [
        'fixtures:read',
        'insights:read',
        'overlays:read',
        'preferences:write',
        'replay:control',
      ].sort(),
    );
  });

  it('keeps the anonymous demo read-only apart from replay controls', () => {
    const anonymous = allowed(ANONYMOUS_ROLE);
    for (const p of anonymous) {
      expect(p.endsWith(':read') || p === 'replay:control').toBe(true);
    }
    expect(anonymous.has('audit:read')).toBe(false);
  });
});

describe('effective permissions', () => {
  it('is the union of role permissions without scopes', () => {
    const perms = effectivePermissions(['viewer', 'developer']);
    expect(perms).toContain('events:ingest');
    expect(perms).toContain('preferences:write');
  });

  it('narrows to permission-shaped scopes and never escalates', () => {
    expect(
      effectivePermissions(
        ['viewer'],
        ['openid', 'fixtures:read', 'audit:read'],
      ),
    ).toEqual(['fixtures:read']);
  });

  it('ignores scopes that name no permission', () => {
    expect(effectivePermissions(['viewer'], ['openid', 'profile'])).toEqual(
      effectivePermissions(['viewer']),
    );
  });

  it('answers can() from effective permissions only', () => {
    const viewer = buildPrincipal({
      kind: 'user',
      userId: 'u1',
      orgId: 'org_a',
      roles: ['viewer'],
      scopes: [],
    });
    expect(can(viewer, 'fixtures:read')).toBe(true);
    expect(can(viewer, 'events:ingest')).toBe(false);
    expect(can(null, 'fixtures:read')).toBe(false);
  });

  it('builds the anonymous and operator-key principals from configuration', () => {
    const anon = anonymousPrincipal('org_demo');
    expect(anon).toMatchObject({ kind: 'anonymous', orgId: 'org_demo' });
    expect(can(anon, 'fixtures:write')).toBe(false);
    const key = operatorKeyPrincipal('org_demo');
    expect(can(key, 'events:ingest')).toBe(true);
    expect(can(key, 'members:manage')).toBe(false);
  });
});
