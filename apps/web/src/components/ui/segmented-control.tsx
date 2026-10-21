'use client';

import { useId } from 'react';
import { cn } from '@/lib/cn';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
  /** Visible text when space is tight; `label` stays the accessible name. */
  short?: string;
};

type SegmentedControlProps<T extends string | number> = {
  legend: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLegend?: boolean;
  className?: string;
};

/** Native radio group: arrow keys, focus and checked state come for free. */
export function SegmentedControl<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  hideLegend = false,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      <legend className={cn('eyebrow mb-1.5', hideLegend && 'sr-only')}>
        {legend}
      </legend>
      <div className="inline-flex rounded-md border border-line bg-surface-sunken p-0.5">
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={cn(
              'relative flex h-7 cursor-pointer items-center rounded-sm px-2.5 text-xs font-medium transition-colors',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent',
              option.value === value
                ? 'bg-surface-raised text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="sr-only"
              aria-label={
                option.short ? `${option.label} (${option.short})` : undefined
              }
            />
            <span aria-hidden={option.short ? true : undefined}>
              {option.short ?? option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
