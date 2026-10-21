import type { MetricUnit, MetricValue } from '@matchiq/contracts';

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;
const PAD = 2;
const PERCENT = 100;

/** Minutes already played before each period starts, and its nominal length. */
const PERIOD_CLOCK: Record<number, { offsetMin: number; lengthMin: number }> = {
  1: { offsetMin: 0, lengthMin: 45 },
  2: { offsetMin: 45, lengthMin: 45 },
  3: { offsetMin: 90, lengthMin: 15 },
  4: { offsetMin: 105, lengthMin: 15 },
  5: { offsetMin: 120, lengthMin: 0 },
};

const periodClock = (period: number | null) =>
  PERIOD_CLOCK[period ?? 1] ?? { offsetMin: 0, lengthMin: 45 };

const pad = (n: number): string => String(n).padStart(PAD, '0');

/** Match time since kick-off, for plotting across periods. */
export const cumulativeMs = (period: number | null, ms: number): number =>
  periodClock(period).offsetMin * MS_PER_MINUTE + ms;

/** Broadcast scoreboard clock: cumulative match time as `MM:SS`. */
export const formatClock = (period: number | null, ms: number): string => {
  const total = cumulativeMs(period, ms);
  const seconds = Math.floor(total / MS_PER_SECOND);
  return `${pad(Math.floor(seconds / SECONDS_PER_MINUTE))}:${pad(seconds % SECONDS_PER_MINUTE)}`;
};

/** Football minute notation, with stoppage time as `45+2'`. */
export const formatMinute = (period: number | null, ms: number): string => {
  const { offsetMin, lengthMin } = periodClock(period);
  const elapsed = Math.floor(ms / MS_PER_MINUTE);
  if (lengthMin > 0 && elapsed >= lengthMin) {
    return `${offsetMin + lengthMin}+${elapsed - lengthMin + 1}'`;
  }
  return `${offsetMin + elapsed + 1}'`;
};

/** A window within one period, e.g. `61'–67'`. */
export const formatWindow = (
  period: number | null,
  startMs: number,
  endMs: number,
): string => `${formatMinute(period, startMs)}–${formatMinute(period, endMs)}`;

const UNIT_SUFFIX: Record<MetricUnit, string> = {
  count: '',
  percent: '%',
  index: '',
  metres: ' m',
  kph: ' km/h',
  mps: ' m/s',
};

const UNIT_DECIMALS: Record<MetricUnit, number> = {
  count: 0,
  percent: 0,
  index: 1,
  metres: 0,
  kph: 1,
  mps: 1,
};

export const formatNumber = (value: number, unit: MetricUnit): string =>
  `${value.toFixed(UNIT_DECIMALS[unit])}${UNIT_SUFFIX[unit]}`;

/** Returns `null` for unavailable metrics so callers must render the reason. */
export const formatMetric = (metric: MetricValue): string | null =>
  metric.status === 'available'
    ? formatNumber(metric.value, metric.unit)
    : null;

export const formatFraction = (fraction: number): string =>
  `${Math.round(fraction * PERCENT)}%`;

const KICKOFF_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export const formatKickoff = (iso: string): string =>
  `${KICKOFF_FORMAT.format(new Date(iso))} UTC`;

export const formatSeconds = (ms: number): string =>
  `${Math.ceil(ms / MS_PER_SECOND)}s`;
