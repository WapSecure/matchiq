'use client';

import { useMemo } from 'react';
import { useRecap, useReplayFinished } from '@/lib/api/hooks';
import type { Variants } from './trace-facts';

export type RecapMomentInfo = { period: number; variants: Variants };

/**
 * Insight periods and write-up languages are only on recap moments (the trace
 * has the period clock only). The recap exists from full time, so it is not
 * requested before then.
 */
export const useRecapMoments = (
  fixtureId: string,
): Map<string, RecapMomentInfo> => {
  const recap = useRecap(fixtureId, { enabled: useReplayFinished(fixtureId) });
  return useMemo(
    () =>
      new Map(
        (recap.data?.keyMoments ?? []).map((m) => [
          m.insightId,
          {
            period: m.period,
            variants: {
              locales: m.narratives.map((n) => n.locale),
              personas: m.narratives.map((n) => n.persona),
            },
          },
        ]),
      ),
    [recap.data],
  );
};
