'use client';

import type { Permission } from '@matchiq/access';
import { useId } from 'react';
import { LockIcon } from '@/components/icons';
import { Button, type ButtonProps } from '@/components/ui';
import { requiresRoleText } from '@/components/auth/require-permission';
import { useCan } from '@/lib/auth/session-store';
import { cn } from '@/lib/cn';

type GatedButtonProps = ButtonProps & { permission: Permission };

/**
 * Without the permission the button stays focusable but inert, and its
 * description says which role it needs. The API still enforces it.
 */
export function GatedButton({
  permission,
  onClick,
  className,
  leadingIcon,
  ...rest
}: GatedButtonProps) {
  const allowed = useCan(permission);
  const hintId = useId();
  if (allowed) {
    return (
      <Button
        {...rest}
        className={className}
        leadingIcon={leadingIcon}
        onClick={onClick}
      />
    );
  }
  const reason = requiresRoleText(permission);
  return (
    <>
      <Button
        {...rest}
        aria-disabled
        aria-describedby={hintId}
        title={reason}
        className={cn('cursor-not-allowed opacity-60', className)}
        leadingIcon={<LockIcon size={14} />}
      />
      <span id={hintId} className="sr-only">
        {reason}
      </span>
    </>
  );
}
