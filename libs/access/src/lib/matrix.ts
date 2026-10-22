import { z } from 'zod';
import { ANONYMOUS_ROLE, PERMISSION_NAMES, ROLE_NAMES } from './constants.js';

export const Role = z.enum(ROLE_NAMES);
export const Permission = z.enum(PERMISSION_NAMES);
export type Role = z.infer<typeof Role>;
export type Permission = z.infer<typeof Permission>;
export type AnyRole = Role | typeof ANONYMOUS_ROLE;

const VIEW: readonly Permission[] = [
  'fixtures:read',
  'insights:read',
  'overlays:read',
];

/**
 * Spec §40. Platform operators get no tenant data or editorial rights;
 * tenant owners administer but do not publish; producers own the on-air
 * decisions; developers ingest and test feeds.
 */
export const ROLE_PERMISSIONS: Readonly<
  Record<AnyRole, readonly Permission[]>
> = {
  'platform-operator': ['platform:diagnostics', 'platform:config'],
  'tenant-owner': [
    ...VIEW,
    'agents:traces:read',
    'replay:control',
    'audit:read',
    'preferences:write',
    'members:manage',
    'policy:configure',
    'billing:read',
  ],
  producer: [
    ...VIEW,
    'agents:traces:read',
    'replay:control',
    'editorial:approve',
    'editorial:publish',
    'audit:read',
    'preferences:write',
  ],
  analyst: [
    ...VIEW,
    'agents:traces:read',
    'replay:control',
    'insights:write',
    'preferences:write',
  ],
  developer: [
    ...VIEW,
    'fixtures:write',
    'events:ingest',
    'agents:traces:read',
    'replay:control',
  ],
  viewer: [...VIEW, 'replay:control', 'preferences:write'],
  /** The public judge path (ADR-0015): published outputs, traces and replay controls. */
  [ANONYMOUS_ROLE]: [...VIEW, 'agents:traces:read', 'replay:control'],
};

/** Roles that grant the permission, for documentation and UI hints. */
export const rolesGranting = (permission: Permission): AnyRole[] =>
  (Object.keys(ROLE_PERMISSIONS) as AnyRole[]).filter((role) =>
    ROLE_PERMISSIONS[role].includes(permission),
  );
