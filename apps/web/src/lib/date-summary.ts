import {
  type DateValue,
  DateFormatter,
  isSameDay,
  today,
  toCalendarDate,
  type ZonedDateTime,
} from '@internationalized/date';
import type { ZonedRange } from './date-time';

const ZONE_SEPARATOR = '/';
const UNDERSCORES = /_/g;

/** `Africa/Lagos` → `Lagos`, `America/Argentina/Buenos_Aires` → `Buenos Aires`. */
export const zoneCity = (timeZone: string): string =>
  (timeZone.split(ZONE_SEPARATOR).pop() ?? timeZone).replace(UNDERSCORES, ' ');

const hasTime = (value: DateValue): boolean => 'hour' in value;

const toDate = (value: DateValue, timeZone: string): Date =>
  'timeZone' in value ? value.toDate() : value.toDate(timeZone);

/** Zoned values read in their own zone; floating ones in the viewer's. */
const zoneOf = (value: DateValue, fallback: string): string =>
  'timeZone' in value ? value.timeZone : fallback;

const formatter = (
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) => new DateFormatter(locale, { ...options, timeZone });

/** `Sat, 24 Oct 2026` (locale order); the year is dropped for the current year when asked. */
export const formatDay = (
  value: DateValue,
  {
    locale,
    timeZone,
    withYear = true,
  }: SummaryOptions & { withYear?: boolean },
): string =>
  formatter(locale, zoneOf(value, timeZone), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: withYear ? 'numeric' : undefined,
  }).format(toDate(value, timeZone));

/** `15:00`; never seconds. */
export const formatClock = (
  value: DateValue,
  { locale, timeZone }: SummaryOptions,
): string =>
  formatter(locale, zoneOf(value, timeZone), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(value, timeZone));

export type SummaryOptions = { locale: string; timeZone: string };

const isThisYear = (value: DateValue, timeZone: string): boolean =>
  value.year === today(timeZone).year;

/** Trigger text for a single date or date and time. */
export const summarizeDate = (
  value: DateValue,
  options: SummaryOptions,
): string => {
  if (!hasTime(value)) return formatDay(value, options);
  const day = formatDay(value, {
    ...options,
    withYear: !isThisYear(value, options.timeZone),
  });
  return `${day}, ${formatClock(value, options)}`;
};

const capitalise = (text: string, locale: string): string =>
  text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);

/** `Today`, `Yesterday` or `Sat 24 Oct`, relative to the viewer's day. */
export const relativeDay = (
  value: ZonedDateTime,
  options: SummaryOptions,
): string => {
  const now = today(options.timeZone);
  const day = toCalendarDate(value);
  const offset = [0, -1, 1].find((d) => isSameDay(day, now.add({ days: d })));
  if (offset === undefined)
    return formatDay(value, {
      ...options,
      withYear: !isThisYear(value, options.timeZone),
    });
  const words = new Intl.RelativeTimeFormat(options.locale, {
    numeric: 'auto',
  }).format(offset, 'day');
  return capitalise(words, options.locale);
};

const EN_DASH = '–';

/** `Today, 14:00–15:30`, or both ends in full when the days differ. */
export const summarizeRange = (
  range: ZonedRange,
  options: SummaryOptions,
): string => {
  const { start, end } = range;
  const from = `${relativeDay(start, options)}, ${formatClock(start, options)}`;
  if (isSameDay(start, end))
    return `${from}${EN_DASH}${formatClock(end, options)}`;
  const to = `${relativeDay(end, options)}, ${formatClock(end, options)}`;
  return `${from} ${EN_DASH} ${to}`;
};
