'use client';

import type { Fixture } from '@matchiq/contracts';
import { useEffect, useMemo } from 'react';
import { MAIN_CONTENT_ID } from '@/constants/site';
import type { SseTransport } from '@/lib/stream';
import { AudienceBar } from './components/audience-controls';
import {
  ConnectionBanner,
  LiveConnection,
} from './components/connection-banner';
import { EvidenceDrawer } from './components/evidence-drawer';
import { InsightFeed } from './components/insight-feed';
import { LiveAnnouncer } from './components/live-announcer';
import { LiveMetrics } from './components/live-metrics';
import { OverlayPanel } from './components/overlay-panel';
import { ReplayControls } from './components/replay-controls';
import { ScoreboardStrip } from './components/scoreboard-strip';
import { SessionFrame } from './components/session-frame';
import { TimelinePanel } from './components/timeline-panel';
import { useMatchStream } from './hooks/use-match-stream';
import { useStudioHydration } from './hooks/use-studio-hydration';
import { buildRoster } from './lib/roster';
import { MatchStoreProvider, type MatchStore, useStudioUi } from './store';

type LiveStudioProps = {
  fixtureId: string;
  store?: MatchStore;
  transport?: SseTransport;
};

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
        <AudienceBar />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
          <OverlayPanel
            homeShort={fixture.home.shortName}
            awayShort={fixture.away.shortName}
            className="xl:col-start-2 xl:row-start-1"
            footer={
              <div className="mt-4">
                <ReplayControls sessionId={fixture.fixtureId} />
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
  const closeEvidence = useStudioUi((s) => s.closeEvidence);
  useMatchStream(fixtureId, { transport });
  useStudioHydration(fixtureId);
  useEffect(() => closeEvidence, [closeEvidence]);

  return (
    <SessionFrame
      fixtureId={fixtureId}
      view="live"
      status={<LiveConnection />}
      banner={<ConnectionBanner />}
    >
      {(fixture) => <StudioGrid fixture={fixture} />}
    </SessionFrame>
  );
}

export function LiveStudio({ fixtureId, store, transport }: LiveStudioProps) {
  return (
    <MatchStoreProvider fixtureId={fixtureId} store={store}>
      <StudioScreen fixtureId={fixtureId} transport={transport} />
    </MatchStoreProvider>
  );
}
