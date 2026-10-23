'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { POLL_MS } from '@/constants/api';
import { fetchAgentRuns } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import { useMatchStore } from '../store';
import { insightMarks } from './insight-marks';

/** Held cues never reach the stream, so their state comes from the read model. */
export const useInsightMarks = () => {
  const fixtureId = useMatchStore((s) => s.fixtureId);
  const suppressed = useMatchStore((s) => s.suppressed);
  const ruledOut = useMatchStore((s) => s.ruledOut);
  const traces = useQuery({
    queryKey: queryKeys.agentRuns(fixtureId),
    queryFn: ({ signal }) => fetchAgentRuns(fixtureId, signal),
    refetchInterval: POLL_MS.editorialMarks,
    retry: false,
  });
  return useMemo(
    () => insightMarks(traces.data, suppressed, ruledOut),
    [traces.data, suppressed, ruledOut],
  );
};
