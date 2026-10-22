type Unit = readonly [Intl.RelativeTimeFormatUnit, number];

const SECOND: Unit = ['second', 1_000];
const UNITS: readonly Unit[] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  SECOND,
];

const RELATIVE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });

const ABSOLUTE = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'UTC',
});

/** "3 minutes ago"; the largest whole unit, never finer than seconds. */
export const formatRelative = (iso: string, nowMs: number): string => {
  const delta = Date.parse(iso) - nowMs;
  const [unit, size] = UNITS.find(([, ms]) => Math.abs(delta) >= ms) ?? SECOND;
  return RELATIVE.format(Math.round(delta / size), unit);
};

/** Absolute UTC timestamp, to the second. */
export const formatTimestamp = (iso: string): string =>
  `${ABSOLUTE.format(new Date(iso))} UTC`;
