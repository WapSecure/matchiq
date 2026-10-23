'use client';

import { LockIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui';
import { SESSION_EXPIRED_COPY } from '@/constants/errors';
import { signInHref, useSessionExpiry } from '@/lib/errors';

/** Shown once a signed-in user's session ends; signing in returns them to the same page. */
export function SessionExpiredNotice() {
  const expired = useSessionExpiry((s) => s.expired);
  if (!expired) return null;
  return (
    <div
      role="alert"
      aria-label={SESSION_EXPIRED_COPY.region}
      data-testid="session-expired"
      className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-warning/40 bg-surface px-4 py-2.5 shadow-panel lg:px-6"
    >
      <LockIcon size={16} className="shrink-0 text-warning" />
      <p className="min-w-0 flex-1 text-sm text-ink">
        <span className="font-medium">{SESSION_EXPIRED_COPY.title}.</span>{' '}
        <span className="text-ink-muted">{SESSION_EXPIRED_COPY.message}</span>
      </p>
      <ButtonLink href={signInHref()} size="sm">
        {SESSION_EXPIRED_COPY.action}
      </ButtonLink>
    </div>
  );
}
