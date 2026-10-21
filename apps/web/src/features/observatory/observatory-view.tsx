'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { AgentsIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { useAgentRuns, useRecap } from '@/lib/api/hooks';
import { TraceCard } from './trace-card';
import { TraceSummary } from './trace-summary';

const copy = OBSERVATORY_COPY;

/** Insight periods are only on recap moments (the trace has period clock only). */
const usePeriods = (fixtureId: string): Map<string, number> => {
  const recap = useRecap(fixtureId);
  return useMemo(
    () =>
      new Map(
        (recap.data?.keyMoments ?? []).map((m) => [m.insightId, m.period]),
      ),
    [recap.data],
  );
};

function Traces({ fixtureId }: { fixtureId: string }) {
  const runs = useAgentRuns(fixtureId);
  const periods = usePeriods(fixtureId);
  if (runs.isPending) {
    return (
      <div
        role="status"
        aria-label={copy.loading}
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (runs.isError) {
    return (
      <ErrorState
        title={copy.error}
        error={runs.error}
        onRetry={() => void runs.refetch()}
      />
    );
  }
  const traces = [...runs.data].sort(
    (a, b) =>
      (periods.get(a.insightId) ?? 0) - (periods.get(b.insightId) ?? 0) ||
      a.matchClockMs - b.matchClockMs,
  );
  return (
    <>
      <TraceSummary traces={traces} />
      {traces.length === 0 ? (
        <EmptyState Icon={AgentsIcon} title={copy.empty} />
      ) : (
        <ol aria-label={copy.listLabel} className="flex flex-col gap-3">
          {traces.map((trace) => (
            <li key={trace.insightId}>
              <TraceCard
                trace={trace}
                period={periods.get(trace.insightId) ?? null}
              />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function ObservatoryView({ fixture }: { fixture: Fixture }) {
  return (
    <main
      id={MAIN_CONTENT_ID}
      className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6"
    >
      <header className="max-w-3xl">
        <p className="eyebrow text-accent">{copy.eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {copy.description}
        </p>
        <p className="mt-1 text-xs text-ink-subtle">{copy.secretsNote}</p>
      </header>
      <Traces fixtureId={fixture.fixtureId} />
    </main>
  );
}
