'use client';

import { useMemo } from 'react';
import { AccessDenied } from '@/components/auth/access-denied';
import { AlertIcon } from '@/components/icons';
import { humanizeError } from '@/lib/errors';
import { cn } from '@/lib/cn';
import { RecoveryAction } from './recovery-action';
import { SupportReference } from './support-reference';

type ErrorStateProps = {
  /** What the user was trying to see, e.g. "We couldn't load the matches". */
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
};

/**
 * What happened, what it means and what to do, in plain words. Problem
 * details, status codes and library messages are never rendered.
 */
export function ErrorState({
  title,
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const human = useMemo(() => humanizeError(error), [error]);
  if (human.kind === 'forbidden') return <AccessDenied className={className} />;
  const heading = human.specific || !title ? human.title : title;
  return (
    <div
      role="alert"
      data-testid="error-state"
      data-error-kind={human.kind}
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-critical/30 bg-critical/5 p-4 sm:flex-row sm:items-center',
        className,
      )}
    >
      <AlertIcon size={18} className="shrink-0 text-critical" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{heading}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{human.message}</p>
        {human.reference && human.support ? (
          <SupportReference reference={human.reference} />
        ) : null}
      </div>
      <RecoveryAction human={human} onRetry={onRetry} />
    </div>
  );
}
