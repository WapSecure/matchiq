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
  sm: 'h-4 w-7',
  md: 'h-5 w-9',
};

const THUMB: Record<ControlSize, string> = {
  sm: 'size-3 group-data-selected:translate-x-3',
  md: 'size-4 group-data-selected:translate-x-4',
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
          'mt-0.5 flex shrink-0 items-center rounded-full border border-line-strong bg-surface-sunken p-px transition-colors duration-150',
          'group-data-hovered:border-control group-data-selected:border-accent group-data-selected:bg-accent',
          'group-data-pressed:brightness-95',
          'group-data-focus-visible:outline-2 group-data-focus-visible:outline-offset-2 group-data-focus-visible:outline-accent',
          TRACK[size],
        )}
      >
        <span
          className={cn(
            'rounded-full bg-control shadow-panel transition-transform duration-150 ease-[var(--ease-broadcast)] group-data-selected:bg-accent-ink',
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
