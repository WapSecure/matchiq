'use client';

import type { DateValue } from '@internationalized/date';
import {
  Button,
  Calendar as AriaCalendar,
  type CalendarProps as AriaCalendarProps,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
  RangeCalendar as AriaRangeCalendar,
  type RangeCalendarProps as AriaRangeCalendarProps,
} from 'react-aria-components';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

const NAV =
  'flex size-7 items-center justify-center rounded-md text-ink-muted outline-none pointer-coarse:size-10 data-hovered:bg-surface-raised data-hovered:text-ink data-pressed:bg-surface-sunken data-focus-visible:outline-2 data-focus-visible:outline-accent data-disabled:opacity-40';

const CELL =
  'flex size-8 cursor-default items-center justify-center rounded-md text-[13px] tabular text-ink outline-none pointer-coarse:size-10 data-hovered:bg-surface-raised data-pressed:bg-surface-sunken data-outside-month:hidden data-unavailable:text-ink-subtle data-unavailable:line-through data-disabled:text-ink-subtle data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-offset-1 data-focus-visible:outline-accent';

const SINGLE_SELECTED =
  'data-selected:bg-accent data-selected:font-semibold data-selected:text-accent-ink';

const RANGE_SELECTED =
  'data-selected:rounded-none data-selected:bg-accent-soft data-selected:text-ink data-selection-start:rounded-s-md data-selection-start:bg-accent data-selection-start:text-accent-ink data-selection-end:rounded-e-md data-selection-end:bg-accent data-selection-end:text-accent-ink';

function CalendarHeader() {
  return (
    <header className="mb-2 flex items-center justify-between gap-2">
      <Button slot="previous" className={NAV}>
        <ChevronLeftIcon size={16} className="rtl:-scale-x-100" />
      </Button>
      <Heading className="text-[13px] font-semibold text-ink" />
      <Button slot="next" className={NAV}>
        <ChevronRightIcon size={16} className="rtl:-scale-x-100" />
      </Button>
    </header>
  );
}

function Grid({ range }: { range: boolean }) {
  return (
    <CalendarGrid className="border-collapse" weekdayStyle="short">
      <CalendarGridHeader>
        {(day) => (
          <CalendarHeaderCell className="pb-1 text-micro font-medium text-ink-subtle">
            {day}
          </CalendarHeaderCell>
        )}
      </CalendarGridHeader>
      <CalendarGridBody>
        {(date) => (
          <CalendarCell
            date={date}
            className={cn(CELL, range ? RANGE_SELECTED : SINGLE_SELECTED)}
          />
        )}
      </CalendarGridBody>
    </CalendarGrid>
  );
}

export function Calendar<T extends DateValue>({
  className,
  ...props
}: Omit<AriaCalendarProps<T>, 'className'> & { className?: string }) {
  return (
    <AriaCalendar {...props} className={cn('w-fit', className)}>
      <CalendarHeader />
      <Grid range={false} />
    </AriaCalendar>
  );
}

export function RangeCalendar<T extends DateValue>({
  className,
  ...props
}: Omit<AriaRangeCalendarProps<T>, 'className'> & { className?: string }) {
  return (
    <AriaRangeCalendar {...props} className={cn('w-fit', className)}>
      <CalendarHeader />
      <Grid range />
    </AriaRangeCalendar>
  );
}
