import {
  type CalendarDate,
  type CalendarDateTime,
  type DateValue,
  now,
  toCalendarDateTime,
  type ZonedDateTime,
} from '@internationalized/date';

export const TIME_STEP_MINUTES = 15;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export type TimedValue = CalendarDateTime | ZonedDateTime;

const wrap = (minutes: number): number =>
  ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

/** Moves to the next or previous quarter hour on the same day, wrapping at midnight. */
export const stepTime = <T extends TimedValue>(
  value: T,
  direction: 1 | -1,
): T => {
  const total = value.hour * MINUTES_PER_HOUR + value.minute;
  const grid = total / TIME_STEP_MINUTES;
  const snapped = direction > 0 ? Math.floor(grid) + 1 : Math.ceil(grid) - 1;
  const next = wrap(snapped * TIME_STEP_MINUTES);
  return value.set({
    hour: Math.floor(next / MINUTES_PER_HOUR),
    minute: next % MINUTES_PER_HOUR,
    second: 0,
    millisecond: 0,
  }) as T;
};

/** Keeps the time of `time`, takes the calendar day of `day`. */
export const withDay = <T extends TimedValue>(time: T, day: DateValue): T =>
  time.set({ year: day.year, month: day.month, day: day.day }) as T;

/** The current instant in the shape of `like`: zoned stays zoned, floating stays floating. */
export const nowLike = <T extends TimedValue>(like: T, timeZone: string): T => {
  const current = now(timeZone).set({ second: 0, millisecond: 0 });
  return ('timeZone' in like ? current : toCalendarDateTime(current)) as T;
};

/** The next quarter hour from now, in the viewer's zone. */
export const nextQuarterHour = (timeZone: string): ZonedDateTime =>
  stepTime(now(timeZone), 1);

/** Midnight at the start of `day` in `timeZone`, or the last minute of it. */
export const dayEdge = (
  day: CalendarDate,
  timeZone: string,
  edge: 'start' | 'end',
): ZonedDateTime =>
  now(timeZone).set({
    year: day.year,
    month: day.month,
    day: day.day,
    hour: edge === 'start' ? 0 : 23,
    minute: edge === 'start' ? 0 : MINUTES_PER_HOUR - 1,
    second: 0,
    millisecond: 0,
  });
