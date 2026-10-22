'use client';

import { type Permission, rolesGranting } from '@matchiq/access';
import type { ReactNode } from 'react';
import { LockIcon } from '@/components/icons';
import { AUTH_COPY, ROLE_LABELS } from '@/constants/auth';
import { useCan } from '@/lib/auth/session-store';

/** "Requires Producer, …": the roles that would unlock a control. */
export const requiresRoleText = (permission: Permission): string =>
  AUTH_COPY.requiresRole(
    rolesGranting(permission)
      .map((role) => ROLE_LABELS[role])
      .join(', '),
  );

/** Says which roles would unlock a hidden control, instead of leaving a gap. */
export function PermissionHint({ permission }: { permission: Permission }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
      <LockIcon size={13} className="shrink-0" />
      {requiresRoleText(permission)}
    </p>
  );
}

type RequirePermissionProps = {
  permission: Permission;
  children: ReactNode;
  /** Defaults to a hint naming the roles that grant the permission. */
  fallback?: ReactNode;
};

/** UI hint only: the API enforces the same permission on every request. */
export function RequirePermission({
  permission,
  children,
  fallback,
}: RequirePermissionProps) {
  const allowed = useCan(permission);
  if (allowed) return children;
  return fallback === undefined ? (
    <PermissionHint permission={permission} />
  ) : (
    fallback
  );
}
