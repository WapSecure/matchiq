import type { MatchSnapshot } from '@matchiq/contracts';
import type { StatRow } from '@/components/match/stat-comparison';
import { STAT_ROWS, STUDIO_COPY } from '@/constants/studio';

const metricRows = (snapshot: MatchSnapshot): StatRow[] => {
  const { passCompletion, shotConversion, passQuality } = STUDIO_COPY.metrics;
  const defs = [
    ['passCompletionPct', passCompletion],
    ['shotConversionPct', shotConversion],
    ['passQualityPct', passQuality],
  ] as const;
  return defs.flatMap(([key, label]) => {
    const home = snapshot.home[key];
    const away = snapshot.away[key];
    return home && away
      ? [{ key, label, kind: 'metric' as const, home, away }]
      : [];
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
