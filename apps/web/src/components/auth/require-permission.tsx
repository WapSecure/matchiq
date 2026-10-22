'use client';

import { type Permission, rolesGranting } from '@matchiq/access';
import type { ReactNode } from 'react';
import { LockIcon } from '@/components/icons';
import { AUTH_COPY, ROLE_LABELS } from '@/constants/auth';
import { useCan } from '@/lib/auth/session-store';

/** Says which roles would unlock a hidden control, instead of leaving a gap. */
export function PermissionHint({ permission }: { permission: Permission }) {
  const roles = rolesGranting(permission)
    .map((role) => ROLE_LABELS[role])
    .join(', ');
  return (
    <p className="flex items-center gap-1.5 text-xs text-ink-muted">
      <LockIcon size={13} className="shrink-0" />
      {AUTH_COPY.requiresRole(roles)}
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
