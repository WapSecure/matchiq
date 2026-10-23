'use client';

import type { ReactNode } from 'react';
import { Switch as AriaSwitch } from 'react-aria-components';
import { cn } from '@/lib/cn';
import type { ControlSize } from './control-styles';

type SwitchProps = {
  children: ReactNode;
  description?: string;
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  isDisabled?: boolean;
  size?: ControlSize;
  className?: string;
};

const TRACK: Record<ControlSize, string> = {
  sm: 'h-[18px] w-8',
  md: 'h-6 w-11',
};

const THUMB: Record<ControlSize, string> = {
  sm: 'size-3.5 group-data-selected:translate-x-3.5',
  md: 'size-5 group-data-selected:translate-x-5',
};

/** On/off setting that takes effect immediately; use Checkbox inside forms. */
export function Switch({
  children,
  description,
  isSelected,
  onChange,
  isDisabled,
  size = 'sm',
  className,
}: SwitchProps) {
  return (
    <AriaSwitch
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cn(
        'group flex min-h-6 cursor-pointer items-start gap-2.5 text-[13px] text-ink pointer-coarse:min-h-11 data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-px flex shrink-0 items-center rounded-full border border-control bg-line-strong p-px transition-[background-color,border-color,box-shadow] duration-200',
          'group-data-hovered:ring-3 group-data-hovered:ring-accent/10 group-data-selected:border-accent group-data-selected:bg-accent',
          'group-data-pressed:brightness-95',
          'group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent',
          TRACK[size],
        )}
      >
        <span
          className={cn(
            'rounded-full bg-surface shadow-[0_1px_2px_0_rgb(0_0_0/0.25)] transition-[transform,width] duration-200 ease-[var(--ease-broadcast)] group-data-pressed:scale-90 group-data-selected:bg-accent-ink',
            THUMB[size],
          )}
        />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{children}</span>
        {description ? (
          <span className="text-xs text-ink-muted">{description}</span>
        ) : null}
      </span>
    </AriaSwitch>
  );
}
