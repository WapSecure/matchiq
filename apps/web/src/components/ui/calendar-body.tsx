'use client';

import { type DateValue, isSameDay } from '@internationalized/date';
import { useId, useMemo, useRef, useState } from 'react';
import {
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
} from 'react-aria-components';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { CalendarExtrasContext, DayCell } from './calendar-cell';
import { type CalendarView, CalendarHeader } from './calendar-header';
import { CalendarMonthGrid } from './calendar-month-grid';
import { CALENDAR_GRID, CALENDAR_LEGEND, WEEKDAY } from './calendar-styles';
import { useAnyCalendarState, useMonthMotion } from './use-calendar-state';

export type CalendarExtraProps = {
  /** Days that get a dot, such as match days. */
  markedDates?: readonly DateValue[];
  /** What a dot means; read out with each marked day. */
  markLabel?: string;
  /** Why struck-through days (`isDateUnavailable`) cannot be picked. */
  unavailableReason?: string;
};

function Grids({ months }: { months: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useAnyCalendarState();
  useMonthMotion(ref, state.visibleRange.start);
  return (
    <div ref={ref} className="flex flex-col gap-4 sm:flex-row sm:gap-6">
      {Array.from({ length: months }, (_, i) => (
        <CalendarGrid
          key={i}
          offset={{ months: i }}
          weekdayStyle="short"
          className={CALENDAR_GRID}
        >
          <CalendarGridHeader>
            {(day) => (
              <CalendarHeaderCell className={WEEKDAY}>{day}</CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody>
            {(date) => <DayCell date={date} />}
          </CalendarGridBody>
        </CalendarGrid>
      ))}
    </div>
  );
}

function Legend({
  markId,
  markLabel,
  unavailableId,
  unavailableReason,
}: {
  markId: string;
  markLabel?: string;
  unavailableId: string;
  unavailableReason?: string;
}) {
  if (!markLabel && !unavailableReason) return null;
  return (
    <div className={CALENDAR_LEGEND}>
      {markLabel ? (
        <span id={markId} className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          {markLabel}
        </span>
      ) : null}
      {unavailableReason ? (
        <span id={unavailableId} className="flex items-center gap-1.5">
          <span aria-hidden className="h-px w-3 bg-ink-subtle" />
          {unavailableReason}
        </span>
      ) : null}
    </div>
  );
}

export function CalendarBody({
  months,
  range,
  markedDates,
  markLabel,
  unavailableReason,
}: CalendarExtraProps & { months: number; range: boolean }) {
  const [view, setView] = useState<CalendarView>('days');
  const markId = useId();
  const unavailableId = useId();
  const label = markedDates?.length
    ? (markLabel ?? DATE_COPY.matchDay)
    : undefined;
  const extras = useMemo(
    () => ({
      range,
      hideOutside: months > 1,
      isMarked: (d: DateValue) =>
        markedDates?.some((m) => isSameDay(m, d)) ?? false,
      markId: label ? markId : undefined,
      unavailableId: unavailableReason ? unavailableId : undefined,
    }),
    [
      range,
      months,
      markedDates,
      label,
      markId,
      unavailableReason,
      unavailableId,
    ],
  );
  return (
    <CalendarExtrasContext.Provider value={extras}>
      {/* Fixed width, so switching to the month list does not resize the popover. */}
      <div
        className={cn(
          'min-w-70 pointer-coarse:min-w-77',
          months > 1 && 'sm:min-w-146',
        )}
      >
        <CalendarHeader view={view} onViewChange={setView} />
        {view === 'months' ? (
          <CalendarMonthGrid onDone={() => setView('days')} />
        ) : (
          <Grids months={months} />
        )}
        <Legend
          markId={markId}
          markLabel={label}
          unavailableId={unavailableId}
          unavailableReason={unavailableReason}
        />
      </div>
    </CalendarExtrasContext.Provider>
  );
}
