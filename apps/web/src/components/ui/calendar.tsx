'use client';

import type { DateValue } from '@internationalized/date';
import {
  Calendar as AriaCalendar,
  type CalendarProps as AriaCalendarProps,
  RangeCalendar as AriaRangeCalendar,
  type RangeCalendarProps as AriaRangeCalendarProps,
} from 'react-aria-components';
import { cn } from '@/lib/cn';
import { CalendarBody, type CalendarExtraProps } from './calendar-body';

export type { CalendarExtraProps } from './calendar-body';

type Shared = CalendarExtraProps & { className?: string };

export function Calendar<T extends DateValue>({
  className,
  markedDates,
  markLabel,
  unavailableReason,
  ...props
}: Omit<AriaCalendarProps<T>, 'className' | 'children'> & Shared) {
  return (
    <AriaCalendar {...props} className={cn('w-fit', className)}>
      <CalendarBody
        months={1}
        range={false}
        markedDates={markedDates}
        markLabel={markLabel}
        unavailableReason={unavailableReason}
      />
    </AriaCalendar>
  );
}

/** Pass `visibleMonths={2}` for side-by-side months; they stack on narrow screens. */
export function RangeCalendar<T extends DateValue>({
  className,
  markedDates,
  markLabel,
  unavailableReason,
  visibleMonths = 1,
  ...props
}: Omit<
  AriaRangeCalendarProps<T>,
  'className' | 'children' | 'visibleDuration'
> &
  Shared & { visibleMonths?: 1 | 2 }) {
  return (
    <AriaRangeCalendar
      {...props}
      visibleDuration={{ months: visibleMonths }}
      className={cn('w-fit', className)}
    >
      <CalendarBody
        months={visibleMonths}
        range
        markedDates={markedDates}
        markLabel={markLabel}
        unavailableReason={unavailableReason}
      />
    </AriaRangeCalendar>
  );
}
