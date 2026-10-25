import type { MatchSnapshot } from '@matchiq/contracts';
import type { StatRow } from '@/components/match/stat-comparison';
import { STAT_ROWS, STUDIO_COPY } from '@/constants/studio';

type MetricKey =
  | 'passCompletionPct'
  | 'shotConversionPct'
  | 'passQualityPct'
  | 'passDistanceAvgM'
  | 'passDifficultyAvg'
  | 'shotSpeedAvgKph';

const hasValue = (
  metric: { status: string } | undefined,
): metric is NonNullable<typeof metric> => metric?.status === 'available';

/** Extra rows appear only when both teams have a measured value. */
const EXTRA_KEYS: readonly MetricKey[] = [
  'passDistanceAvgM',
  'passDifficultyAvg',
  'shotSpeedAvgKph',
];

const metricRows = (snapshot: MatchSnapshot): StatRow[] => {
  const m = STUDIO_COPY.metrics;
  const defs: readonly (readonly [MetricKey, string])[] = [
    ['passCompletionPct', m.passCompletion],
    ['shotConversionPct', m.shotConversion],
    ['passQualityPct', m.passQuality],
    ['passDistanceAvgM', m.passDistance],
    ['passDifficultyAvg', m.passDifficulty],
    ['shotSpeedAvgKph', m.shotSpeed],
  ];
  return defs.flatMap(([key, label]) => {
    const home = snapshot.home[key];
    const away = snapshot.away[key];
    if (!home || !away) return [];
    if (EXTRA_KEYS.includes(key) && !(hasValue(home) && hasValue(away))) {
      return [];
    }
    return [{ key, label, kind: 'metric' as const, home, away }];
  });
};

/** Team comparison rows; values come straight from the engine snapshot. */
export const statRows = (snapshot: MatchSnapshot): StatRow[] => [
  ...STAT_ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    kind: 'count' as const,
    home: snapshot.home[r.key],
    away: snapshot.away[r.key],
  })),
  ...metricRows(snapshot),
];
