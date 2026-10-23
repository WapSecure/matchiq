'use client';

import {
  type CalendarDate,
  type DateValue,
  now,
  toCalendarDate,
  type ZonedDateTime,
} from '@internationalized/date';
import { useState } from 'react';
import { dayEdge, withDay } from '@/lib/date-edit';
import {
  type InstantRange,
  rangeToZoned,
  type ZonedRange,
} from '@/lib/date-time';

export type RangeDraft = {
  draft: ZonedRange | null;
  /** Start and end times shown even before any day is picked. */
  times: ZonedRange;
  days: { start: CalendarDate; end: CalendarDate } | null;
  isReversed: boolean;
  pickDays: (days: { start: DateValue; end: DateValue }) => void;
  setTime: (edge: 'start' | 'end', value: ZonedDateTime) => void;
  setExact: (edge: 'start' | 'end', value: ZonedDateTime | null) => void;
  setDraft: (range: ZonedRange | null) => void;
};

const defaultTimes = (timeZone: string): ZonedRange => {
  const day = toCalendarDate(now(timeZone));
  return {
    start: dayEdge(day, timeZone, 'start'),
    end: dayEdge(day, timeZone, 'end'),
  };
};

/** The window being edited in the popover; nothing reaches the parent until Apply. */
export function useRangeDraft(
  value: InstantRange | null,
  timeZone: string,
): RangeDraft {
  const [draft, setDraft] = useState(() => rangeToZoned(value, timeZone));
  // Times chosen before any day is picked; applied once the days are.
  const [pending, setPending] = useState(() => defaultTimes(timeZone));
  const times = draft ?? pending;
  const days = draft
    ? { start: toCalendarDate(draft.start), end: toCalendarDate(draft.end) }
    : null;
  return {
    draft,
    times,
    days,
    isReversed: Boolean(draft && draft.end.compare(draft.start) < 0),
    pickDays: (picked) =>
      setDraft({
        start: withDay(times.start, picked.start),
        end: withDay(times.end, picked.end),
      }),
    setTime: (edge, next) => {
      if (draft) setDraft({ ...draft, [edge]: next });
      else setPending({ ...pending, [edge]: next });
    },
    setExact: (edge, next) =>
      setDraft((d) => {
        if (!next) return d;
        return { ...(d ?? times), [edge]: next };
      }),
    setDraft,
  };
}
