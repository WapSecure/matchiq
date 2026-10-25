'use client';

import { useQuery } from '@tanstack/react-query';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui';
import { MOMENT_TRACE_COPY } from '@/constants/moment-trace';
import { POLL_MS } from '@/constants/api';
import { useAgentSteps } from '@/features/observatory/use-agent-steps';
import { fetchAgentRuns } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/api/query-keys';
import type { InsightTrace } from '@/lib/api/trace-schemas';
import { ChainView } from './chain-view';
import { buildChain } from './moment-chain';

const copy = MOMENT_TRACE_COPY;

function Loading() {
  return (
    <div
      role="status"
      aria-label={copy.loading}
      className="flex flex-col gap-2"
    >
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}

function Note({ children }: { children: string }) {
  return <p className="text-xs text-ink-subtle">{children}</p>;
}

function Steps({ trace, moment }: { trace: InsightTrace; moment: string }) {
  const { ready, query } = useAgentSteps(trace);
  if (trace.publication === 'PENDING') return <Note>{copy.pending}</Note>;
  if (ready && query.isPending) return <Loading />;
  if (ready && query.isError) {
    return (
      <ErrorState
        title={copy.error}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }
  const steps = ready ? (query.data?.steps ?? []) : [];
  return <ChainView chain={buildChain(trace, steps)} moment={moment} />;
}

/** Loads on first open: one shared moments request per match, then this moment's steps. */
export function HowWrittenBody({
  fixtureId,
  insightId,
  moment,
}: {
  fixtureId: string;
  insightId: string;
  moment: string;
}) {
  const runs = useQuery({
    queryKey: queryKeys.agentRuns(fixtureId),
    queryFn: ({ signal }) => fetchAgentRuns(fixtureId, signal),
    refetchInterval: (q) =>
      q.state.data?.find((t) => t.insightId === insightId)?.publication ===
      'PENDING'
        ? POLL_MS.agentRuns
        : false,
  });
  if (runs.isPending) return <Loading />;
  if (runs.isError) {
    return (
      <ErrorState
        title={copy.error}
        error={runs.error}
        onRetry={() => void runs.refetch()}
      />
    );
  }
  const trace = runs.data.find((t) => t.insightId === insightId);
  if (!trace) return <Note>{copy.empty}</Note>;
  return <Steps trace={trace} moment={moment} />;
}
