'use client';

import { type ReactNode, useId } from 'react';
import { Checkbox as AriaCheckbox } from 'react-aria-components';
import { CheckIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { ERROR_TEXT } from './control-styles';

type CheckboxProps = {
  children: ReactNode;
  description?: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  errorMessage?: string;
  /** Bordered card with room for a description. */
  card?: boolean;
  className?: string;
};

export function Checkbox({
  children,
  description,
  isSelected,
  onChange,
  isIndeterminate,
  isDisabled,
  errorMessage,
  card = false,
  className,
}: CheckboxProps) {
  const errorId = useId();
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <AriaCheckbox
        isSelected={isSelected}
        onChange={onChange}
        isIndeterminate={isIndeterminate}
        isDisabled={isDisabled}
        isInvalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? errorId : undefined}
        className={cn(
          'group flex min-h-6 cursor-pointer items-start gap-2.5 text-[13px] text-ink pointer-coarse:min-h-11 data-disabled:cursor-not-allowed data-disabled:opacity-50',
          card &&
            'press rounded-lg border border-line-strong bg-surface p-3 shadow-panel transition-[border-color,background-color,box-shadow] data-hovered:border-control data-selected:border-accent data-selected:bg-accent-soft data-selected:shadow-[0_0_0_1px_var(--mq-accent)] data-invalid:border-critical',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-control bg-surface text-accent-ink transition-colors duration-150',
            'group-data-hovered:border-ink-subtle group-data-hovered:ring-3 group-data-hovered:ring-accent/10 group-data-selected:border-accent group-data-selected:bg-accent group-data-indeterminate:border-accent group-data-indeterminate:bg-accent',
            'group-data-invalid:border-critical group-data-pressed:scale-95',
            'group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent',
          )}
        >
          {isIndeterminate ? (
            <span className="h-0.5 w-2 rounded-full bg-current" />
          ) : (
            <CheckIcon
              size={12}
              strokeWidth={2.5}
              className="scale-50 opacity-0 transition-[transform,opacity] duration-150 group-data-selected:scale-100 group-data-selected:opacity-100"
            />
          )}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{children}</span>
          {description ? (
            <span className="text-xs leading-snug text-ink-muted">
              {description}
            </span>
          ) : null}
        </span>
      </AriaCheckbox>
      {errorMessage ? (
        <p id={errorId} className={ERROR_TEXT}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
