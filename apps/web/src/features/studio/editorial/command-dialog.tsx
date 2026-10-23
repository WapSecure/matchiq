'use client';

import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useState,
} from 'react';
import { InlineProblem } from '@/components/feedback/inline-problem';
import type { IconProps } from '@/components/icons';
import { Button, Modal } from '@/components/ui';
import { EDITORIAL_COPY } from '@/constants/editorial';
import { ConfirmStep, type ConfirmCopy } from './confirm-step';
import { reasonError } from './reason';
import { ReasonField } from './reason-field';
import type { EditorialCommand } from './use-editorial-command';

export type DialogCopy = {
  title: string;
  description: string;
  submit: string;
  pending: string;
};

type CommandDialogProps = {
  command: EditorialCommand;
  copy: DialogCopy;
  Icon: ComponentType<IconProps>;
  tone?: 'default' | 'danger';
  /** Adds a typed-confirmation step after the reason (kill switch). */
  confirm?: ConfirmCopy;
  /** What the command acts on, shown above the reason. */
  subject?: ReactNode;
};

const submitLabel = ({
  advancing,
  pending,
  copy,
  confirm,
}: {
  advancing: boolean;
  pending: boolean;
  copy: DialogCopy;
  confirm?: ConfirmCopy;
}): string => {
  if (advancing && confirm) return confirm.next;
  return pending ? copy.pending : copy.submit;
};

function CommandForm({
  command,
  copy,
  tone,
  confirm,
  subject,
}: CommandDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<'reason' | 'confirm'>('reason');
  const [phrase, setPhrase] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const error = touched ? reasonError(reason) : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (command.pending) return;
    setTouched(true);
    if (reasonError(reason)) return;
    if (confirm && step === 'reason') return setStep('confirm');
    if (confirm && phrase.trim() !== confirm.phrase) return setMismatch(true);
    command.submit(reason);
  };
  const confirming = confirm !== undefined && step === 'confirm';
  const advancing = confirm !== undefined && step === 'reason';
  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {subject}
      {confirming ? (
        <ConfirmStep
          copy={confirm}
          reason={reason.trim()}
          value={phrase}
          onChange={(value) => {
            setPhrase(value);
            setMismatch(false);
          }}
          error={mismatch}
          disabled={command.pending}
        />
      ) : (
        <ReasonField
          value={reason}
          onChange={setReason}
          error={error}
          disabled={command.pending}
        />
      )}
      {command.problem ? (
        <InlineProblem
          error={command.problem.error}
          message={command.problem.message}
        />
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          onClick={confirming ? () => setStep('reason') : command.close}
          disabled={command.pending}
        >
          {confirming ? confirm.back : EDITORIAL_COPY.cancel}
        </Button>
        <Button
          type="submit"
          variant={tone === 'danger' ? 'danger' : 'primary'}
          aria-disabled={command.pending || undefined}
        >
          {submitLabel({ advancing, pending: command.pending, copy, confirm })}
        </Button>
      </div>
    </form>
  );
}

/**
 * Reason-first producer command in an accessible modal; errors stay in the
 * dialog. Mounted only while open, so closed commands add nothing to the page.
 */
export function CommandDialog(props: CommandDialogProps) {
  const { command, copy, Icon, tone } = props;
  if (!command.open) return null;
  return (
    <Modal
      open={command.open}
      onClose={command.close}
      title={copy.title}
      description={copy.description}
      Icon={Icon}
      tone={tone}
    >
      <CommandForm {...props} />
    </Modal>
  );
}
