'use client';

import { usePathname } from 'next/navigation';
import { AlertIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui';
import {
  AUTH_COPY,
  AUTH_ERRORS,
  AUTH_QUERY,
  AUTH_ROUTES,
} from '@/constants/auth';
import { useSession } from '@/lib/auth/session-store';

/** Shown once the server reports the session has ended, instead of silent empty panels. */
export function SessionExpiredNotice() {
  const expired = useSession((s) => s.view?.status === 'expired');
  const pathname = usePathname();
  if (!expired) return null;
  const query = new URLSearchParams({
    [AUTH_QUERY.returnTo]: pathname,
    [AUTH_QUERY.error]: AUTH_ERRORS.expired,
  });
  return (
    <div
      role="alert"
      data-testid="session-expired"
      className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 border-b border-critical/30 bg-surface px-4 py-2 text-sm text-ink"
    >
      <AlertIcon size={16} className="shrink-0 text-critical" />
      <span>{AUTH_COPY.errors.expired}</span>
      <ButtonLink
        href={`${AUTH_ROUTES.signInPage}?${query.toString()}`}
        variant="secondary"
        size="sm"
      >
        {AUTH_COPY.sessionExpiredAction}
      </ButtonLink>
    </div>
  );
}
