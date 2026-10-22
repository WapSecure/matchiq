'use client';

import { useId } from 'react';
import { LockIcon } from '@/components/icons';
import { ButtonLink } from '@/components/ui';
import { AUTH_COPY, ROLE_LABELS } from '@/constants/auth';
import { ROUTES } from '@/constants/navigation';
import { rolesOf, useSession } from '@/lib/auth/session-store';

/** The 403 state: a labelled region rather than an alert, since nothing failed. */
export function AccessDenied({ className }: { className?: string }) {
  const headingId = useId();
  const roles = rolesOf(useSession((s) => s.view));
  const role = roles.map((r) => ROLE_LABELS[r]).join(', ');
  return (
    <section
      aria-labelledby={headingId}
      data-testid="access-denied"
      className={`flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-6 ${className ?? ''}`}
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-surface-raised text-ink-muted">
        <LockIcon size={18} />
      </span>
      <h2 id={headingId} className="text-base font-semibold text-ink">
        {AUTH_COPY.forbiddenTitle}
      </h2>
      <p className="max-w-prose text-sm text-ink-muted">
        {AUTH_COPY.forbiddenBody(role)}
      </p>
      <ButtonLink href={ROUTES.fixtures} variant="secondary" size="sm">
        {AUTH_COPY.forbiddenAction}
      </ButtonLink>
    </section>
  );
}
