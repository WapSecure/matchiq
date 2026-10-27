'use client';

import { RefreshIcon } from '@/components/icons';
import { Button, ButtonLink } from '@/components/ui';
import { ERROR_UI } from '@/constants/errors';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import type { InterfaceMessages } from '@/features/interface-language/interface-messages';
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
  copy,
}: {
  onRetry: () => void;
  waitFor: number;
  copy: InterfaceMessages['feedback']['recovery'];
}) {
  return (
    <Button
      onClick={onRetry}
      disabled={waitFor > 0}
      leadingIcon={<RefreshIcon size={14} />}
    >
      {waitFor > 0 ? copy.retryIn(waitFor) : copy.retry}
    </Button>
  );
}

/** The single recovery a humanized error offers. */
export function RecoveryAction({ human, onRetry }: RecoveryActionProps) {
  const copy = useInterfaceMessages().feedback.recovery;
  const waitSeconds =
    human.action === 'wait'
      ? (human.retryAfterSeconds ?? ERROR_UI.defaultWaitSeconds)
      : null;
  const left = useCountdown(waitSeconds, human);
  switch (human.action) {
    case 'signIn':
      return (
        <ButtonLink href={signInHref()} size="sm">
          {copy.signIn}
        </ButtonLink>
      );
    case 'lobby':
      return (
        <ButtonLink href={ROUTES.fixtures} variant="secondary" size="sm">
          {copy.lobby}
        </ButtonLink>
      );
    case 'reload':
      return (
        <Button
          onClick={() => window.location.reload()}
          leadingIcon={<RefreshIcon size={14} />}
        >
          {copy.reload}
        </Button>
      );
    case 'wait':
      if (onRetry)
        return <RetryButton onRetry={onRetry} waitFor={left} copy={copy} />;
      return left > 0 ? (
        <p role="timer" className="tabular text-xs text-ink-muted">
          {copy.waitFor(left)}
        </p>
      ) : null;
    case 'retry':
      return onRetry ? (
        <RetryButton onRetry={onRetry} waitFor={0} copy={copy} />
      ) : null;
    default:
      return null;
  }
}
