'use client';

import { useEffect, useId, useRef } from 'react';
import { cn } from '@/lib/cn';

export type ConfirmCopy = {
  phrase: string;
  confirmTitle: string;
  confirmBody: string;
  confirmLabel: string;
  confirmHint: string;
  mismatch: string;
  reasonSummary: string;
  next: string;
  back: string;
};

type ConfirmStepProps = {
  copy: ConfirmCopy;
  reason: string;
  value: string;
  onChange: (value: string) => void;
  error: boolean;
  disabled: boolean;
};

/** Second step of a guarded command: restates the reason, then asks for the phrase. */
export function ConfirmStep({
  copy,
  reason,
  value,
  onChange,
  error,
  disabled,
}: ConfirmStepProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-critical/40 bg-critical/5 p-3">
        <p className="text-[13px] font-semibold text-ink">
          {copy.confirmTitle}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {copy.confirmBody}
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          <span className="font-medium text-ink">{copy.reasonSummary}: </span>
          {reason}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {copy.confirmLabel}
        </label>
        <input
          ref={input}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          className={cn(
            'h-9 rounded-md border bg-surface-sunken px-3 font-mono text-[13px] tracking-[0.12em] text-ink',
            error ? 'border-critical' : 'border-line-strong',
          )}
        />
        <p
          id={`${id}-hint`}
          className={cn('text-xs', error ? 'text-critical' : 'text-ink-subtle')}
        >
          {error ? copy.mismatch : copy.confirmHint}
        </p>
      </div>
    </div>
  );
}
