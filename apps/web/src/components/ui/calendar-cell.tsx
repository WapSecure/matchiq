'use client';

import type { CalendarDate } from '@internationalized/date';
import { createContext, useContext } from 'react';
import {
  CalendarCell,
  type CalendarCellRenderProps,
} from 'react-aria-components';
import { cn } from '@/lib/cn';
import {
  DAY_BAND,
  DAY_CELL,
  DAY_MARKER,
  PILL_BASE,
  PILL_FOCUS,
  PILL_HOVER,
  PILL_PRESSED,
  PILL_TONE,
} from './calendar-styles';

export type CalendarExtras = {
  range: boolean;
  /** With several months side by side, spill-over days would repeat. */
  hideOutside?: boolean;
  isMarked: (date: CalendarDate) => boolean;
  /** Ids of the legend lines that explain a marker or an unavailable day. */
  markId?: string;
  unavailableId?: string;
};

export const CalendarExtrasContext = createContext<CalendarExtras>({
  range: false,
  isMarked: () => false,
});

type DayState = CalendarCellRenderProps & { range: boolean };

const isChosen = (s: DayState): boolean =>
  !s.isOutsideMonth &&
  (s.range ? s.isSelectionStart || s.isSelectionEnd : s.isSelected);

function tone(s: DayState): string {
  if (isChosen(s))
    return s.isHovered ? PILL_TONE.chosenHover : PILL_TONE.chosen;
  if (s.isUnavailable) return PILL_TONE.struck;
  if (s.isOutsideMonth) return PILL_TONE.muted;
  if (s.isToday) return PILL_TONE.today;
  return PILL_TONE.idle;
}

function interaction(s: DayState): string | false {
  if (isChosen(s) || s.isDisabled) return false;
  if (s.isPressed) return PILL_PRESSED;
  return s.isHovered && PILL_HOVER;
}

function DayContent({ state, marked }: { state: DayState; marked: boolean }) {
  return (
    <span
      className={cn(
        PILL_BASE,
        tone(state),
        interaction(state),
        state.isFocusVisible && PILL_FOCUS,
      )}
    >
      {state.formattedDate}
      {marked && !state.isOutsideMonth ? (
        <span
          aria-hidden
          className={cn(
            DAY_MARKER,
            isChosen(state) ? 'bg-current' : 'bg-accent',
          )}
        />
      ) : null}
    </span>
  );
}

/** A day: the band for ranges, a pill for its state, a dot for marked days. */
export function DayCell({ date }: { date: CalendarDate }) {
  const extras = useContext(CalendarExtrasContext);
  const marked = extras.isMarked(date);
  return (
    <CalendarCell
      date={date}
      className={cn(
        DAY_CELL,
        extras.range && DAY_BAND,
        extras.hideOutside && 'data-outside-month:invisible',
      )}
      render={(props, values) => {
        const describedBy = [
          marked ? extras.markId : undefined,
          values?.isUnavailable ? extras.unavailableId : undefined,
        ]
          .filter(Boolean)
          .join(' ');
        return <div {...props} aria-describedby={describedBy || undefined} />;
      }}
    >
      {(values) => (
        <DayContent
          state={{ ...values, range: extras.range }}
          marked={marked}
        />
      )}
    </CalendarCell>
  );
}
