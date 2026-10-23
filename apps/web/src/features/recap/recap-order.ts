import type { RecapMoment } from '@/lib/api/session-schemas';
import { cumulativeMs } from '@/lib/format';

/** Key moments in match order, across periods. */
export const orderedMoments = (
  moments: readonly RecapMoment[],
): RecapMoment[] =>
  [...moments].sort(
    (a, b) =>
      cumulativeMs(a.period, a.matchClockMs) -
      cumulativeMs(b.period, b.matchClockMs),
  );

export const momentAnchor = (insightId: string) => `recap-${insightId}`;
