'use client';

import { useId } from 'react';
import { CheckIcon, CloseIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { APPROVAL_COPY } from '@/constants/approval';
import { SHORTCUTS_COPY } from '@/constants/approval-shortcuts';
import { KeyHint } from './key-hint';

type Props = {
  headline: string;
  busy: boolean;
  pending: 'APPROVE' | 'REJECT' | null;
  shortcuts: boolean;
  onApprove: () => void;
  onReject: () => void;
};

/** Send to air and Don't air, with their shortcuts as hints and descriptions. */
export function ReviewActions({
  headline,
  busy,
  pending,
  shortcuts,
  onApprove,
  onReject,
}: Props) {
  const approveHelp = useId();
  const rejectHelp = useId();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        variant="ghost"
        size="sm"
        aria-label={APPROVAL_COPY.rejectLabel(headline)}
        aria-disabled={busy || undefined}
        aria-describedby={shortcuts ? rejectHelp : undefined}
        leadingIcon={<CloseIcon size={14} />}
        onClick={() => busy || onReject()}
      >
        {pending === 'REJECT' ? APPROVAL_COPY.rejecting : APPROVAL_COPY.reject}
        {shortcuts ? <KeyHint>D</KeyHint> : null}
      </Button>
      <Button
        size="sm"
        aria-label={APPROVAL_COPY.approveLabel(headline)}
        aria-disabled={busy || undefined}
        aria-describedby={shortcuts ? approveHelp : undefined}
        leadingIcon={<CheckIcon size={14} />}
        onClick={() => busy || onApprove()}
      >
        {pending === 'APPROVE'
          ? APPROVAL_COPY.approving
          : APPROVAL_COPY.approve}
        {shortcuts ? <KeyHint>A</KeyHint> : null}
      </Button>
      {shortcuts ? (
        <>
          <span id={rejectHelp} hidden>
            {SHORTCUTS_COPY.rejectDescription}
          </span>
          <span id={approveHelp} hidden>
            {SHORTCUTS_COPY.approveDescription}
          </span>
        </>
      ) : null}
    </div>
  );
}
