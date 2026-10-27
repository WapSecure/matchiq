import {
  DEFAULT_INTERFACE_LOCALE,
  type InterfaceLocale,
} from '@/features/interface-language/interface-locales';

type Unit = readonly [Intl.RelativeTimeFormatUnit, number];

const SECOND: Unit = ['second', 1_000];
const UNITS: readonly Unit[] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  SECOND,
];

type RelativeStyle = 'long' | 'short';

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();
const absoluteFormatters = new Map<InterfaceLocale, Intl.DateTimeFormat>();

const relativeFormatter = (locale: InterfaceLocale, style: RelativeStyle) => {
  const key = `${locale}:${style}`;
  const cached = relativeFormatters.get(key);
  if (cached) return cached;
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
    style,
  });
  relativeFormatters.set(key, formatter);
  return formatter;
};

const absoluteFormatter = (locale: InterfaceLocale) => {
  const cached = absoluteFormatters.get(locale);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });
  absoluteFormatters.set(locale, formatter);
  return formatter;
};

/** "3 minutes ago" (or "3 min ago" when short); the largest whole unit, never finer than seconds. */
export const formatRelative = (
  iso: string,
  nowMs: number,
  style: RelativeStyle = 'long',
  locale: InterfaceLocale = DEFAULT_INTERFACE_LOCALE,
): string => {
  const delta = Date.parse(iso) - nowMs;
  const [unit, size] = UNITS.find(([, ms]) => Math.abs(delta) >= ms) ?? SECOND;
  return relativeFormatter(locale, style).format(
    Math.round(delta / size),
    unit,
  );
};

/** Absolute UTC timestamp, to the second. */
export const formatTimestamp = (
  iso: string,
  locale: InterfaceLocale = DEFAULT_INTERFACE_LOCALE,
): string => `${absoluteFormatter(locale).format(new Date(iso))} UTC`;
