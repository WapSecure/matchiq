import type { MatchSnapshot } from '@matchiq/contracts';
import type { StatRow } from '@/components/match/stat-comparison';
import { STAT_ROWS, STUDIO_COPY } from '@/constants/studio';

/** Team comparison rows; values come straight from the engine snapshot. */
export const statRows = (snapshot: MatchSnapshot): StatRow[] => [
  ...STAT_ROWS.map((r) => ({
    key: r.key,
    label: r.label,
    kind: 'count' as const,
    home: snapshot.home[r.key],
    away: snapshot.away[r.key],
  })),
  {
    key: 'passCompletionPct',
    label: STUDIO_COPY.metrics.passCompletion,
    kind: 'metric',
    home: snapshot.home.passCompletionPct,
    away: snapshot.away.passCompletionPct,
  },
];
