'use client';

import type { Fixture } from '@matchiq/contracts';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import { RECAP_COPY } from '@/constants/recap';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { AudienceBar } from '@/features/studio/components/audience-controls';
import { isApiError } from '@/lib/api/api-error';
import { useRecap } from '@/lib/api/hooks';
import { RecapMatchStory } from './recap-match-story';
import { FinalMetrics } from './recap-metrics';
import { RecapMoments } from './recap-moments';
import { RecapNotReady } from './recap-not-ready';
import { RecapScoreline } from './recap-scoreline';

const MAIN = 'mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6';

function Loading() {
  return (
    <div
      role="status"
      aria-label={RECAP_COPY.loading}
      className="flex flex-col gap-4"
    >
      <Skeleton className="h-64" />
      <Skeleton className="h-16" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function RecapView({ fixture }: { fixture: Fixture }) {
  const recap = useRecap(fixture.fixtureId);
  const notReady =
    isApiError(recap.error) && recap.error.status === HTTP_STATUS.notFound;
  return (
    <main id={MAIN_CONTENT_ID} className={MAIN}>
      {recap.isPending ? <Loading /> : null}
      {notReady ? <RecapNotReady fixtureId={fixture.fixtureId} /> : null}
      {recap.isError && !notReady ? (
        <ErrorState
          title={RECAP_COPY.error}
          error={recap.error}
          onRetry={() => void recap.refetch()}
        />
      ) : null}
      {recap.data ? (
        <>
          <RecapScoreline fixture={fixture} recap={recap.data} />
          <AudienceBar />
          <RecapMatchStory recap={recap.data} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <RecapMoments recap={recap.data} fixture={fixture} />
            <FinalMetrics recap={recap.data} fixture={fixture} />
          </div>
        </>
      ) : null}
    </main>
  );
}
