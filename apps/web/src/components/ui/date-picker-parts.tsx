'use client';

import type { ReactNode } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import { ClockIcon } from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { zoneCity } from '@/lib/date-summary';

/** Popover sections share one gutter so the panes line up. */
export const PANE = 'p-3 sm:p-4';
export const PANE_DIVIDER = 'border-t border-line';

export function ZoneNote({ timeZone }: { timeZone: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-micro text-ink-subtle">
      <ClockIcon size={12} className="shrink-0" />
      <span className="truncate">{DATE_COPY.zoneNote(zoneCity(timeZone))}</span>
    </span>
  );
}

/** Zone line and a mode switch on one row: `Shown in your local time (Lagos) · Enter exact times`. */
export function FooterMeta({
  timeZone,
  children,
}: {
  timeZone?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {timeZone ? (
        <>
          <ZoneNote timeZone={timeZone} />
          <span aria-hidden className="size-0.5 rounded-full bg-ink-subtle" />
        </>
      ) : null}
      {children}
    </div>
  );
}

/** A quiet text button, for switching between the calendar and typed entry. */
export function TextAction({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <AriaButton
      slot={null}
      onPress={onPress}
      className="inline-flex min-h-6 items-center rounded-sm text-[13px] font-medium text-accent underline-offset-4 outline-none transition-colors pointer-coarse:min-h-11 data-hovered:underline data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-accent"
    >
      {children}
    </AriaButton>
  );
}

/** Bottom bar: context on the left, actions on the right; stacks on phones. */
export function PickerFooter({
  start,
  children,
  className,
}: {
  start?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 flex flex-col gap-2.5 rounded-b-lg bg-surface-raised px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-4',
        PANE_DIVIDER,
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">{start}</div>
      {children ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          {children}
        </div>
      ) : null}
    </footer>
  );
}
