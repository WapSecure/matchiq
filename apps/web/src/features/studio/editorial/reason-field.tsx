'use client';

import { useId } from 'react';
import { EDITORIAL_COPY } from '@/constants/editorial';
import { cn } from '@/lib/cn';
import { REASON_MAX, REASON_MIN } from './reason';

type ReasonFieldProps = {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  disabled?: boolean;
};

const copy = EDITORIAL_COPY.reason;

/** Required free-text justification, validated like the API contract. */
export function ReasonField({
  value,
  onChange,
  error,
  disabled = false,
}: ReasonFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {copy.label}
        </label>
        <span aria-hidden className="tabular text-micro text-ink-subtle">
          {copy.count(value.trim().length, REASON_MAX)}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${hintId}` : hintId}
        className={cn(
          'w-full resize-y rounded-md border bg-surface-sunken px-3 py-2 text-[13px] text-ink placeholder:text-ink-subtle',
          error ? 'border-critical' : 'border-line-strong',
        )}
      />
      <p id={hintId} className="text-xs text-ink-subtle">
        {copy.hint(REASON_MIN, REASON_MAX)}
      </p>
      {error ? (
        <p id={errorId} className="text-xs font-medium text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
