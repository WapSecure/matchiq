'use client';

import { RefreshIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui';
import { ERROR_UI } from '@/constants/errors';
import { ROUTES } from '@/constants/navigation';
import type { HumanError } from '@/lib/errors';
import { signInHref } from '@/lib/errors/sign-in-href';
import { useCountdown } from './use-countdown';

type RecoveryActionProps = {
  human: HumanError;
  onRetry?: () => void;
};

function RetryButton({
  onRetry,
  waitFor,
}: {
  onRetry: () => void;
  waitFor: number;
}) {
  return (
    <Button
      onClick={onRetry}
      disabled={waitFor > 0}
      leadingIcon={<RefreshIcon size={14} />}
    >
      {waitFor > 0 ? ERROR_UI.retryIn(waitFor) : ERROR_UI.retry}
    </Button>
  );
}

/** The single recovery a humanized error offers. */
export function RecoveryAction({ human, onRetry }: RecoveryActionProps) {
  const waitSeconds =
    human.action === 'wait'
      ? (human.retryAfterSeconds ?? ERROR_UI.defaultWaitSeconds)
      : null;
  const left = useCountdown(waitSeconds, human);
  switch (human.action) {
    case 'signIn':
      return (
        <ButtonLink href={signInHref()} size="sm">
          {ERROR_UI.signIn}
        </ButtonLink>
      );
    case 'lobby':
      return (
        <ButtonLink href={ROUTES.fixtures} variant="secondary" size="sm">
          {ERROR_UI.lobby}
        </ButtonLink>
      );
    case 'reload':
      return (
        <Button
          onClick={() => window.location.reload()}
          leadingIcon={<RefreshIcon size={14} />}
        >
          {ERROR_UI.reload}
        </Button>
      );
    case 'wait':
      if (onRetry) return <RetryButton onRetry={onRetry} waitFor={left} />;
      return left > 0 ? (
        <p role="timer" className="tabular text-xs text-ink-muted">
          {ERROR_UI.waitFor(left)}
        </p>
      ) : null;
    case 'retry':
      return onRetry ? <RetryButton onRetry={onRetry} waitFor={0} /> : null;
    default:
      return null;
  }
}
