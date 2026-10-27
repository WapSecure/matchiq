'use client';

import { useMemo } from 'react';
import { AlertIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { humanizeError } from '@/lib/errors';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { localizeError } from '@/features/interface-language/localize-error';
import { RecoveryAction } from './recovery-action';
import { SupportReference } from './support-reference';

type InlineProblemProps = {
  error: unknown;
  /** Replaces the humanized wording when the surface has more specific copy. */
  message?: string;
  /** What was being attempted, e.g. "We couldn't start the replay." Ignored for specific problems. */
  lead?: string;
  onRetry?: () => void;
  className?: string;
};

/** A failed action, explained in one line under the control that ran it. */
export function InlineProblem({
  error,
  message,
  lead,
  onRetry,
  className,
}: InlineProblemProps) {
  const messages = useInterfaceMessages();
  const human = useMemo(
    () => localizeError(humanizeError(error), messages.feedback.errors),
    [error, messages],
  );
  const text =
    message ??
    (lead && !human.headline
      ? `${lead} ${human.message}`
      : `${human.title}. ${human.message}`);
  return (
    <div
      role="alert"
      data-testid="inline-problem"
      data-error-kind={human.kind}
      className={cn(
        'flex flex-wrap items-start gap-2 rounded-md border border-critical/40 bg-critical/5 p-3 text-xs text-ink',
        className,
      )}
    >
      <AlertIcon size={16} className="mt-px shrink-0 text-critical" />
      <div className="min-w-0 flex-1">
        <p>{text}</p>
        {human.reference && human.support ? (
          <SupportReference reference={human.reference} />
        ) : null}
      </div>
      <RecoveryAction human={human} onRetry={onRetry} />
    </div>
  );
}
