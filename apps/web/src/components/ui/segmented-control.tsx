'use client';

import type { ReactNode } from 'react';
import { Label, Radio, RadioGroup } from 'react-aria-components';
import { cn } from '@/lib/cn';
import type { ControlSize } from './control-styles';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
  /** BCP 47 tag when the label is in another language (WCAG 3.1.2). */
  lang?: string;
  /** Visible text when space is tight; `label` stays the accessible name. */
  short?: string;
  icon?: ReactNode;
  isDisabled?: boolean;
};

type SegmentedControlProps<T extends string | number> = {
  legend: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLegend?: boolean;
  size?: ControlSize;
  className?: string;
};

const SEGMENT_SIZE: Record<ControlSize, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-[13px]',
};

/** Radio group styled as segments: arrow keys move and select, like native radios. */
export function SegmentedControl<T extends string | number>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  hideLegend = false,
  size = 'sm',
  className,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroup
      value={String(value)}
      onChange={(key) => {
        const next = options.find((o) => String(o.value) === key);
        if (next) onChange(next.value);
      }}
      isDisabled={disabled}
      orientation="horizontal"
      className={cn('group min-w-0', className)}
    >
      <Label className={cn('eyebrow mb-1.5 block', hideLegend && 'sr-only')}>
        {legend}
      </Label>
      <div className="inline-flex max-w-full gap-0.5 rounded-lg border border-line bg-surface-raised p-0.5 shadow-[inset_0_1px_2px_0_var(--mq-shade)] group-data-disabled:opacity-50">
        {options.map((option) => (
          <Radio
            key={String(option.value)}
            value={String(option.value)}
            lang={option.lang}
            isDisabled={option.isDisabled}
            aria-label={
              option.short ? `${option.label} (${option.short})` : undefined
            }
            className={cn(
              'press relative flex cursor-pointer items-center gap-1.5 rounded-md font-medium outline-none transition-[background-color,color,box-shadow] duration-150 pointer-coarse:min-h-11',
              SEGMENT_SIZE[size],
              'text-ink-muted data-hovered:bg-ink/5 data-hovered:text-ink',
              'data-selected:bg-selected data-selected:font-semibold data-selected:text-ink data-selected:shadow-[0_1px_2px_0_var(--mq-shade),0_0_0_1px_var(--mq-line-strong)] data-selected:data-hovered:bg-selected',
              'data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent',
              'data-disabled:cursor-not-allowed data-disabled:opacity-50',
            )}
          >
            {option.icon}
            <span aria-hidden={option.short ? true : undefined}>
              {option.short ?? option.label}
            </span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
