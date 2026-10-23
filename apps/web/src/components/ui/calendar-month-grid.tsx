'use client';

import {
  type CalendarDate,
  DateFormatter,
  endOfMonth,
  startOfMonth,
} from '@internationalized/date';
import { useState } from 'react';
import { Button, ToggleButton, useLocale } from 'react-aria-components';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { CALENDAR_NAV, MONTH_TILE } from './calendar-styles';
import { useAnyCalendarState } from './use-calendar-state';

const MONTHS_IN_YEAR = 12;

type State = ReturnType<typeof useAnyCalendarState>;

const outOfBounds = (state: State, month: CalendarDate): boolean =>
  Boolean(
    (state.minValue && endOfMonth(month).compare(state.minValue) < 0) ||
    (state.maxValue && startOfMonth(month).compare(state.maxValue) > 0),
  );

/** Jumps straight to a month in any year, then hands back to the day grid. */
export function CalendarMonthGrid({ onDone }: { onDone: () => void }) {
  const state = useAnyCalendarState();
  const { locale } = useLocale();
  const focused = state.focusedDate;
  const [year, setYear] = useState(focused.year);
  const name = new DateFormatter(locale, {
    month: 'short',
    timeZone: state.timeZone,
  });
  const months = Array.from({ length: MONTHS_IN_YEAR }, (_, i) =>
    startOfMonth(focused.set({ year, month: i + 1, day: 1 })),
  );
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <Button
          slot={null}
          aria-label={DATE_COPY.previousYear}
          onPress={() => setYear((y) => y - 1)}
          className={CALENDAR_NAV}
        >
          <ChevronLeftIcon size={16} className="rtl:-scale-x-100" />
        </Button>
        <span aria-live="polite" className="text-sm font-semibold tabular">
          {year}
        </span>
        <Button
          slot={null}
          aria-label={DATE_COPY.nextYear}
          onPress={() => setYear((y) => y + 1)}
          className={CALENDAR_NAV}
        >
          <ChevronRightIcon size={16} className="rtl:-scale-x-100" />
        </Button>
      </div>
      <div
        role="group"
        aria-label={String(year)}
        className="grid grid-cols-3 gap-1"
      >
        {months.map((month) => (
          <ToggleButton
            key={month.month}
            isSelected={month.month === focused.month && year === focused.year}
            isDisabled={outOfBounds(state, month)}
            onChange={() => {
              state.setFocusedDate(focused.set({ year, month: month.month }));
              onDone();
            }}
            className={MONTH_TILE}
          >
            {name.format(month.toDate(state.timeZone))}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}
