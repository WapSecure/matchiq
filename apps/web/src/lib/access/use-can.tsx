'use client';

import type { Permission } from '@matchiq/access';
import { createContext, type ReactNode, useContext } from 'react';
import { ACCESS_MODE } from '@/constants/access';

export type PermissionCheck = (permission: Permission) => boolean;

const defaultCheck: PermissionCheck = () => ACCESS_MODE === 'operator-key';

const PermissionsContext = createContext<PermissionCheck>(defaultCheck);

/**
 * Integration point for web sign-in (ADR-0015): mount with the signed-in
 * principal's permissions and every `useCan` caller follows.
 */
export function PermissionsProvider({
  can,
  children,
}: {
  can: PermissionCheck;
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={can}>
      {children}
    </PermissionsContext.Provider>
  );
}

/** UI affordance only; the API enforces every permission (ADR-0016). */
export const useCan = (permission: Permission): boolean =>
  useContext(PermissionsContext)(permission);
