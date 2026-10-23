'use client';

import type { ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { PAGINATION_COPY as C } from '@/constants/pagination';
import { cn } from '@/lib/cn';
import { Button } from '../button';
import { Skeleton } from '../skeleton';

/** Keeps focus on an edge button instead of dropping it, and still reads as unavailable. */
export const EDGE_DISABLED =
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:shadow-none aria-disabled:hover:border-line-strong aria-disabled:hover:bg-surface';

export const NAV_ROW =
  'flex flex-wrap items-center justify-between gap-x-4 gap-y-3';

/** The range sentence; a polite live region, so a new page is announced without moving focus. */
export function PageSummary({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <p
      role="status"
      aria-atomic
      aria-busy={busy || undefined}
      className="tabular min-w-0 text-xs text-ink-muted"
    >
      {children}
    </p>
  );
}

export function StepButton({
  direction,
  isDisabled,
  onPress,
  label,
}: {
  direction: 'previous' | 'next';
  isDisabled: boolean;
  onPress: () => void;
  /** Visible text from `sm` up; the accessible name always says "page". */
  label?: string;
}) {
  const previous = direction === 'previous';
  const Icon = previous ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Button
      aria-label={previous ? C.previousPage : C.nextPage}
      aria-disabled={isDisabled || undefined}
      onClick={() => {
        if (!isDisabled) onPress();
      }}
      className={cn(
        'min-w-8 pointer-coarse:h-11 pointer-coarse:min-w-11',
        EDGE_DISABLED,
      )}
    >
      {previous ? <Icon size={14} /> : null}
      <span className="hidden sm:inline">
        {label ?? (previous ? C.previous : C.next)}
      </span>
      {previous ? null : <Icon size={14} />}
    </Button>
  );
}

/** Placeholder rows at the height of real ones, so the page does not jump when data lands. */
export function SkeletonRows({
  count,
  label,
  rowClassName = 'h-12',
  className,
}: {
  count: number;
  label: string;
  rowClassName?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex flex-col gap-2', className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}
