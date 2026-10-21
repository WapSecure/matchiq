'use client';

import type { Fixture } from '@matchiq/contracts';
import { useEffect, useMemo } from 'react';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { STUDIO_COPY } from '@/constants/studio';
import { isApiError } from '@/lib/api/api-error';
import { useFixture } from '@/lib/api/hooks';
import type { SseTransport } from '@/lib/stream';
import { LocaleSwitcher, PersonaToggle } from './components/audience-controls';
import { EvidenceDrawer } from './components/evidence-drawer';
import { InsightFeed } from './components/insight-feed';
import { LiveAnnouncer } from './components/live-announcer';
import { LiveMetrics } from './components/live-metrics';
import { OverlayPanel } from './components/overlay-panel';
import { ReplayControls } from './components/replay-controls';
import { ScoreboardStrip } from './components/scoreboard-strip';
import { ConnectionBanner, StudioHeader } from './components/studio-header';
import { TimelinePanel } from './components/timeline-panel';
import { useMatchStream } from './hooks/use-match-stream';
import { useStudioBootstrap } from './hooks/use-studio-bootstrap';
import { buildRoster } from './lib/roster';
import { MatchStoreProvider, type MatchStore, useStudioUi } from './store';

type LiveStudioProps = {
  fixtureId: string;
  store?: MatchStore;
  transport?: SseTransport;
};

const NOT_FOUND = 404;
const SIDE_PANEL = 'max-h-[32rem] xl:h-0 xl:max-h-none xl:min-h-full';

function StudioGrid({ fixture }: { fixture: Fixture }) {
  const roster = useMemo(() => buildRoster(fixture), [fixture]);
  return (
    <>
      <ScoreboardStrip fixture={fixture} />
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 lg:px-6"
      >
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <PersonaToggle />
          <LocaleSwitcher />
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
          <OverlayPanel
            homeShort={fixture.home.shortName}
            awayShort={fixture.away.shortName}
            className="xl:col-start-2 xl:row-start-1"
            footer={
              <div className="mt-4">
                <ReplayControls fixtureId={fixture.fixtureId} />
              </div>
            }
          />
          <InsightFeed
            roster={roster}
            className={`${SIDE_PANEL} xl:col-start-3 xl:row-start-1`}
          />
          <TimelinePanel
            roster={roster}
            className={`${SIDE_PANEL} lg:col-span-2 xl:col-span-1 xl:col-start-1 xl:row-start-1`}
          />
        </div>
        <LiveMetrics
          fixtureId={fixture.fixtureId}
          homeName={fixture.home.name}
          awayName={fixture.away.name}
        />
      </main>
      <EvidenceDrawer roster={roster} />
      <LiveAnnouncer />
    </>
  );
}

function StudioScreen({
  fixtureId,
  transport,
}: Omit<LiveStudioProps, 'store'>) {
  const fixture = useFixture(fixtureId);
  const closeEvidence = useStudioUi((s) => s.closeEvidence);
  const { state } = useStudioBootstrap(fixtureId);
  // With no Last-Event-ID the stream starts at the live head, so seed state first.
  useMatchStream(fixtureId, { transport, enabled: state.isFetched });
  useEffect(() => closeEvidence, [closeEvidence]);

  return (
    <>
      <StudioHeader
        title={fixture.data?.title ?? null}
        competition={fixture.data?.competitionLabel ?? null}
      />
      <ConnectionBanner />
      {fixture.data ? <StudioGrid fixture={fixture.data} /> : null}
      {fixture.isPending ? (
        <main
          id={MAIN_CONTENT_ID}
          aria-busy="true"
          className="mx-auto grid max-w-[1920px] gap-4 p-4 lg:grid-cols-3 lg:px-6"
        >
          <Skeleton className="h-20 lg:col-span-3" />
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </main>
      ) : null}
      {fixture.isError ? (
        <main id={MAIN_CONTENT_ID} className="mx-auto max-w-3xl p-6">
          <ErrorState
            title={
              isApiError(fixture.error) && fixture.error.status === NOT_FOUND
                ? STUDIO_COPY.notFound
                : STUDIO_COPY.loadError
            }
            error={fixture.error}
            onRetry={() => void fixture.refetch()}
          />
        </main>
      ) : null}
    </>
  );
}

export function LiveStudio({ fixtureId, store, transport }: LiveStudioProps) {
  return (
    <MatchStoreProvider fixtureId={fixtureId} store={store}>
      <StudioScreen fixtureId={fixtureId} transport={transport} />
    </MatchStoreProvider>
  );
}
