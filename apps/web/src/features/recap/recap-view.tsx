'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { TimelineIcon, TrophyIcon } from '@/components/icons';
import { ButtonLink, Panel, Skeleton } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import { ROUTES } from '@/constants/navigation';
import { RECAP_COPY } from '@/constants/recap';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { AudienceBar } from '@/features/studio/components/audience-controls';
import { buildRoster } from '@/features/studio/lib/roster';
import { useStudioUi } from '@/features/studio/store';
import { isApiError } from '@/lib/api/api-error';
import { useRecap } from '@/lib/api/hooks';
import type { RecapDocument } from '@/lib/api/session-schemas';
import { cumulativeMs } from '@/lib/format';
import { FinalMetrics } from './recap-metrics';
import { RecapMomentItem } from './recap-moment';
import { RecapScoreline } from './recap-scoreline';

const MAIN = 'mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6';

function NotReady({ fixtureId }: { fixtureId: string }) {
  const copy = RECAP_COPY.notReady;
  return (
    <EmptyState
      Icon={TrophyIcon}
      title={copy.title}
      description={copy.description}
      action={
        <ButtonLink href={ROUTES.studio(fixtureId)} variant="secondary">
          {copy.back}
        </ButtonLink>
      }
    />
  );
}

function Moments({
  recap,
  fixture,
}: {
  recap: RecapDocument;
  fixture: Fixture;
}) {
  const persona = useStudioUi((s) => s.persona);
  const locale = useStudioUi((s) => s.locale);
  const roster = useMemo(() => buildRoster(fixture), [fixture]);
  const ordered = [...recap.keyMoments].sort(
    (a, b) =>
      cumulativeMs(a.period, a.matchClockMs) -
      cumulativeMs(b.period, b.matchClockMs),
  );
  return (
    <Panel
      id="recap-moments"
      title={RECAP_COPY.momentsTitle}
      description={RECAP_COPY.momentsDescription}
      Icon={TimelineIcon}
      bodyClassName="p-0"
    >
      {ordered.length === 0 ? (
        <EmptyState compact title={RECAP_COPY.momentsEmpty} />
      ) : (
        <ol aria-label={RECAP_COPY.momentsTitle}>
          {ordered.map((moment) => (
            <RecapMomentItem
              key={moment.insightId}
              moment={moment}
              team={roster.team(moment.teamId)}
              persona={persona}
              locale={locale}
            />
          ))}
        </ol>
      )}
    </Panel>
  );
}

export function RecapView({ fixture }: { fixture: Fixture }) {
  const recap = useRecap(fixture.fixtureId);
  const notReady =
    isApiError(recap.error) && recap.error.status === HTTP_STATUS.notFound;
  return (
    <main id={MAIN_CONTENT_ID} className={MAIN}>
      {recap.isPending ? (
        <div role="status" aria-label={RECAP_COPY.loading}>
          <Skeleton className="h-48" />
        </div>
      ) : null}
      {notReady ? <NotReady fixtureId={fixture.fixtureId} /> : null}
      {recap.isError && !notReady ? (
        <ErrorState
          title={RECAP_COPY.error}
          error={recap.error}
          onRetry={() => void recap.refetch()}
        />
      ) : null}
      {recap.data ? (
        <>
          <RecapScoreline
            fixture={fixture}
            snapshot={recap.data.finalSnapshot}
            recap={recap.data}
          />
          <AudienceBar />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Moments recap={recap.data} fixture={fixture} />
            <FinalMetrics recap={recap.data} fixture={fixture} />
          </div>
        </>
      ) : null}
    </main>
  );
}
