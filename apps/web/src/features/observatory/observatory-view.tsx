'use client';

import type { Fixture } from '@matchiq/contracts';
import { EmptyState, ErrorState } from '@/components/feedback';
import { AgentsIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { OBSERVATORY_COPY } from '@/constants/observatory';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { useAgentRuns } from '@/lib/api/hooks';
import { FallbackNote } from './fallback-note';
import { MomentList } from './moment-list';
import { RecordedNote } from './recorded-note';
import { TraceSummary } from './trace-summary';
import { useRecapMoments } from './use-recap-moments';

const copy = OBSERVATORY_COPY;

function Traces({ fixtureId }: { fixtureId: string }) {
  const state = usePageMessages().states.observatory;
  const runs = useAgentRuns(fixtureId);
  const moments = useRecapMoments(fixtureId);
  if (runs.isPending) {
    return (
      <div
        role="status"
        aria-label={state.loading}
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-28" />
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (runs.isError) {
    return (
      <ErrorState
        title={state.error}
        error={runs.error}
        onRetry={() => void runs.refetch()}
      />
    );
  }
  const period = (id: string) => moments.get(id)?.period ?? 0;
  const traces = [...runs.data].sort(
    (a, b) =>
      period(a.insightId) - period(b.insightId) ||
      a.matchClockMs - b.matchClockMs,
  );
  return (
    <>
      <TraceSummary traces={traces} />
      <RecordedNote traces={traces} />
      <FallbackNote traces={traces} />
      {traces.length === 0 ? (
        <EmptyState Icon={AgentsIcon} title={state.empty} />
      ) : (
        <MomentList traces={traces} moments={moments} />
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
