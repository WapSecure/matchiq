'use client';

import { DateFormatter, endOfMonth } from '@internationalized/date';
import { Button, Heading, useLocale } from 'react-aria-components';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { DATE_COPY } from '@/constants/ui';
import { cn } from '@/lib/cn';
import { CALENDAR_NAV, CALENDAR_TITLE } from './calendar-styles';
import { useAnyCalendarState } from './use-calendar-state';

export type CalendarView = 'days' | 'months';

/** `October 2026`, or `October–November 2026` when two months show. */
export function useVisibleTitle(): string {
  const { locale } = useLocale();
  const state = useAnyCalendarState();
  const { start, end } = state.visibleRange;
  const format = new DateFormatter(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: state.timeZone,
  });
  const from = start.toDate(state.timeZone);
  const to = endOfMonth(end).toDate(state.timeZone);
  return start.month === end.month && start.year === end.year
    ? format.format(from)
    : format.formatRange(from, to);
}

/** Title doubles as the month and year switch; arrows page by the visible months. */
export function CalendarHeader({
  view,
  onViewChange,
}: {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}) {
  const title = useVisibleTitle();
  const months = view === 'months';
  return (
    <header className="mb-2 flex items-center justify-between gap-2">
      {/* React Aria's heading stays for screen readers; the button is the visible title. */}
      <Heading className="sr-only" />
      <Button
        slot={null}
        aria-label={DATE_COPY.chooseMonth(title)}
        aria-expanded={months}
        onPress={() => onViewChange(months ? 'days' : 'months')}
        className={CALENDAR_TITLE}
      >
        <span aria-hidden>{title}</span>
        <ChevronDownIcon
          size={14}
          className={cn(
            'text-ink-subtle transition-transform duration-150',
            months && 'rotate-180',
          )}
        />
      </Button>
      <div className={cn('flex items-center gap-0.5', months && 'invisible')}>
        <Button slot="previous" className={CALENDAR_NAV}>
          <ChevronLeftIcon size={16} className="rtl:-scale-x-100" />
        </Button>
        <Button slot="next" className={CALENDAR_NAV}>
          <ChevronRightIcon size={16} className="rtl:-scale-x-100" />
        </Button>
      </div>
    </header>
  );
}
