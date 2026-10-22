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
import { PitchPanel } from './components/pitch-panel';
import { ReplayControls } from './components/replay-controls';
import { ScoreboardStrip } from './components/scoreboard-strip';
import { SessionFrame } from './components/session-frame';
import { TimelinePanel } from './components/timeline-panel';
import { ProducerControlBar } from './editorial/control-bar';
import { EditorialNotice } from './editorial/editorial-notice';
import { EditorialBanner, EditorialChip } from './editorial/editorial-status';
import { useMatchStream } from './hooks/use-match-stream';
import { useStudioHydration } from './hooks/use-studio-hydration';
import { buildRoster } from './lib/roster';
import { MatchStoreProvider, type MatchStore, useStudioUi } from './store';

type LiveStudioProps = {
  fixtureId: string;
  store?: MatchStore;
  transport?: SseTransport;
};

/**
 * Console grid. xl: primary column (scoreboard → program preview → transport
 * → pitch) beside a secondary stack. 2xl: the secondary stack splits in two.
 */
const GRID =
  'grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,1fr)] 2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,1fr)_minmax(22rem,1fr)]';
const COLUMN = 'flex min-w-0 flex-col gap-4';
const FEED = 'max-h-[34rem] xl:max-h-[38rem] 2xl:max-h-[calc(100dvh-9rem)]';

function StudioGrid({ fixture }: { fixture: Fixture }) {
  const roster = useMemo(() => buildRoster(fixture), [fixture]);
  return (
    <>
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 lg:px-6"
      >
        <ProducerControlBar />
        <AudienceBar />
        <div className={GRID}>
          <div className={COLUMN}>
            <ScoreboardStrip fixture={fixture} />
            <OverlayPanel
              homeShort={fixture.home.shortName}
              awayShort={fixture.away.shortName}
              footer={
                <div className="mt-4 border-t border-line pt-4">
                  <ReplayControls sessionId={fixture.fixtureId} />
                </div>
              }
            />
            <PitchPanel fixture={fixture} roster={roster} />
          </div>
          <div className={`${COLUMN} 2xl:contents`}>
            <div className="min-w-0 2xl:sticky 2xl:top-28">
              <InsightFeed roster={roster} className={FEED} />
            </div>
            <div className={COLUMN}>
              <TimelinePanel roster={roster} className="max-h-[30rem]" />
              <LiveMetrics
                homeName={fixture.home.name}
                awayName={fixture.away.name}
              />
            </div>
          </div>
        </div>
      </main>
      <EvidenceDrawer roster={roster} />
      <LiveAnnouncer />
      <EditorialNotice />
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
      status={
        <>
          <EditorialChip />
          <LiveConnection />
        </>
      }
      banner={
        <>
          <ConnectionBanner />
          <EditorialBanner />
        </>
      }
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
