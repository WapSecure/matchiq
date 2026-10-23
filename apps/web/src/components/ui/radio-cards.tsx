'use client';

import { Radio, RadioGroup } from 'react-aria-components';
import { cn } from '@/lib/cn';
import { FieldFrame, type FieldProps } from './field';
import type { ChoiceOption } from './option-item';

type RadioCardsProps<K extends string> = Omit<FieldProps, 'size'> & {
  options: readonly ChoiceOption<K>[];
  value: K | null;
  onChange: (value: K) => void;
  columns?: 1 | 2 | 3;
};

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
} as const;

/** Mutually exclusive choices that need a sentence of explanation each. */
export function RadioCards<K extends string>({
  label,
  hideLabel,
  description,
  errorMessage,
  isDisabled,
  options,
  value,
  onChange,
  columns = 2,
  className,
}: RadioCardsProps<K>) {
  return (
    <RadioGroup
      value={value}
      onChange={(key) => {
        const next = options.find((o) => o.id === key);
        if (next) onChange(next.id);
      }}
      isDisabled={isDisabled}
      isInvalid={Boolean(errorMessage)}
      className={cn('group flex min-w-0 flex-col gap-2', className)}
    >
      <FieldFrame
        label={label}
        hideLabel={hideLabel}
        description={description}
        errorMessage={errorMessage}
      >
        <div className={cn('grid gap-2', COLUMNS[columns])}>
          {options.map((option) => (
            <Radio
              key={option.id}
              value={option.id}
              isDisabled={Boolean(option.disabledReason)}
              className={cn(
                'press group/card relative flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-surface p-3 text-left shadow-panel outline-none',
                'data-hovered:border-control data-pressed:bg-surface-raised',
                'data-selected:border-accent data-selected:bg-accent-soft data-selected:shadow-[0_0_0_1px_var(--mq-accent)]',
                'data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent',
                'data-disabled:cursor-not-allowed data-disabled:opacity-60',
                'group-data-invalid:border-critical',
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-control bg-surface group-data-selected/card:border-accent"
              >
                <span className="size-2 scale-0 rounded-full bg-accent transition-transform duration-150 group-data-selected/card:scale-100" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  {option.icon}
                  {option.label}
                </span>
                {option.description ? (
                  <span className="text-xs leading-snug text-ink-muted">
                    {option.description}
                  </span>
                ) : null}
                {option.disabledReason ? (
                  <span className="text-xs text-ink-subtle">
                    {option.disabledReason}
                  </span>
                ) : null}
              </span>
            </Radio>
          ))}
        </div>
      </FieldFrame>
    </RadioGroup>
  );
}
