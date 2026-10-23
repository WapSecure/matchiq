import {
  getLocalTimeZone,
  now,
  parseAbsolute,
  toCalendarDate,
  toZoned,
  type ZonedDateTime,
} from '@internationalized/date';
import type { Locale } from '@matchiq/contracts';
import type { DatePresetId } from '@/constants/ui';

/** Intl has no date data for Nigerian Pidgin, so it reads dates as British English. */
const DATE_LOCALE_FALLBACK: Partial<Record<Locale, string>> = {
  'pcm-NG': 'en-GB',
};

export const DEFAULT_DATE_LOCALE = 'en-GB';

export const dateLocaleFor = (locale: Locale | undefined): string =>
  locale ? (DATE_LOCALE_FALLBACK[locale] ?? locale) : DEFAULT_DATE_LOCALE;

export const localTimeZone = (): string => getLocalTimeZone();

export type InstantRange = { start: string; end: string };
export type ZonedRange = { start: ZonedDateTime; end: ZonedDateTime };

/** `null` for empty or unparseable input rather than throwing. */
export const isoToZoned = (
  iso: string,
  timeZone: string,
): ZonedDateTime | null => {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return parseAbsolute(new Date(iso).toISOString(), timeZone);
};

export const zonedToIso = (value: ZonedDateTime): string =>
  value.toDate().toISOString();

export const rangeToZoned = (
  range: InstantRange | null,
  timeZone: string,
): ZonedRange | null => {
  if (!range) return null;
  const start = isoToZoned(range.start, timeZone);
  const end = isoToZoned(range.end, timeZone);
  return start && end ? { start, end } : null;
};

/** Orders the ends so a reversed selection still means the same window. */
export const zonedToRange = (range: ZonedRange): InstantRange => {
  const [a, b] = [zonedToIso(range.start), zonedToIso(range.end)];
  return a <= b ? { start: a, end: b } : { start: b, end: a };
};

/** `2026-10-23 14:05:00` in UTC, for showing next to a local time. */
export const formatUtc = (iso: string): string =>
  new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

type PresetContext = {
  timeZone: string;
  /** Defaults to the current instant; injected by tests. */
  at?: ZonedDateTime;
  /** Bounds of the match being reviewed, for "This match". */
  matchWindow?: InstantRange | null;
};

const MINUTES = { last15m: 15, lastHour: 60, last24h: 1_440 } as const;
const DAYS_IN_WEEK = 7;

/** The window a preset stands for at the given instant; null when it cannot apply. */
export const presetRange = (
  id: DatePresetId,
  { timeZone, at, matchWindow }: PresetContext,
): ZonedRange | null => {
  const end = at ?? now(timeZone);
  switch (id) {
    case 'last15m':
    case 'lastHour':
    case 'last24h':
      return { start: end.subtract({ minutes: MINUTES[id] }), end };
    case 'today':
      return { start: toZoned(toCalendarDate(end), timeZone), end };
    case 'last7d':
      return { start: end.subtract({ days: DAYS_IN_WEEK }), end };
    case 'thisMatch':
      return rangeToZoned(matchWindow ?? null, timeZone);
    default:
      return null;
  }
};
