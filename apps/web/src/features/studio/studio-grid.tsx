'use client';

import type { Fixture } from '@matchiq/contracts';
import { useMemo } from 'react';
import { RequirePermission } from '@/components/auth/require-permission';
import { RegionBoundary } from '@/components/feedback';
import { REGION_NAMES as R } from '@/constants/errors';
import { PLAYER_FOCUS_COPY } from '@/constants/player-focus';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { PlayerFocusPanel } from '@/features/player-focus/player-focus-panel';
import { EvidenceDrawer } from './components/evidence-drawer';
import { InsightFeed } from './components/insight-feed';
import { LiveAnnouncer } from './components/live-announcer';
import { LiveMetrics } from './components/live-metrics';
import { OverlayPanel } from './components/overlay-panel';
import { PitchPanel } from './components/pitch-panel';
import { ReplayControls } from './components/replay-controls';
import { ScoreboardStrip } from './components/scoreboard-strip';
import { TimelinePanel } from './components/timeline-panel';
import { ProducerControlBar } from './editorial/control-bar';
import { EditorialNotice } from './editorial/editorial-notice';
import { buildRoster } from './lib/roster';

/**
 * Console grid. xl: primary column (scoreboard → on-air preview → transport
 * → pitch) beside a secondary stack; 2xl splits the secondary stack in two.
 * Below xl the columns dissolve (`contents`) so one list can be reordered:
 * the pitch map drops below the key moments, events and stats on phones.
 */
const GRID =
  'grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,1fr)] 2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,1fr)_minmax(22rem,1fr)]';
const COLUMN = 'contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4';
const FEED = 'max-h-[34rem] xl:max-h-[38rem] 2xl:max-h-[calc(100dvh-9rem)]';
const SLOT = {
  scoreboard: 'min-w-0 order-1 xl:order-none',
  preview: 'min-w-0 order-2 xl:order-none',
  feed: 'min-w-0 order-3 xl:order-none 2xl:sticky 2xl:top-28',
  events: 'min-w-0 order-4 xl:order-none',
  stats: 'min-w-0 order-5 xl:order-none',
  pitch: 'min-w-0 order-6 xl:order-none',
  focus: 'min-w-0 order-7 xl:order-none',
} as const;

export function StudioGrid({ fixture }: { fixture: Fixture }) {
  const roster = useMemo(() => buildRoster(fixture), [fixture]);
  return (
    <>
      <main
        id={MAIN_CONTENT_ID}
        className="mx-auto flex max-w-[1920px] flex-col gap-4 px-4 py-4 lg:px-6"
      >
        <RegionBoundary region={R.controls}>
          <ProducerControlBar />
        </RegionBoundary>
        <div className={GRID}>
          <div className={COLUMN}>
            <div className={SLOT.scoreboard}>
              <RegionBoundary region={R.scoreboard}>
                <ScoreboardStrip fixture={fixture} />
              </RegionBoundary>
            </div>
            <div className={SLOT.preview}>
              <RegionBoundary region={R.preview}>
                <OverlayPanel
                  homeShort={fixture.home.shortName}
                  awayShort={fixture.away.shortName}
                  footer={
                    <div className="mt-4 border-t border-line pt-4">
                      <RequirePermission permission="replay:control">
                        <ReplayControls
                          sessionId={fixture.fixtureId}
                          roster={roster}
                        />
                      </RequirePermission>
                    </div>
                  }
                />
              </RegionBoundary>
            </div>
            <div className={SLOT.pitch}>
              <RegionBoundary region={R.pitch}>
                <PitchPanel fixture={fixture} roster={roster} />
              </RegionBoundary>
            </div>
          </div>
          <div className={`${COLUMN} 2xl:contents`}>
            <div className={SLOT.feed}>
              <RegionBoundary region={R.moments}>
                <InsightFeed roster={roster} className={FEED} />
              </RegionBoundary>
            </div>
            <div className={COLUMN}>
              <div className={SLOT.events}>
                <RegionBoundary region={R.events}>
                  <TimelinePanel roster={roster} className="max-h-[30rem]" />
                </RegionBoundary>
              </div>
              <div className={SLOT.stats}>
                <RegionBoundary region={R.stats}>
                  <LiveMetrics
                    homeName={fixture.home.name}
                    awayName={fixture.away.name}
                  />
                </RegionBoundary>
              </div>
              <div className={SLOT.focus}>
                <RegionBoundary region={PLAYER_FOCUS_COPY.region}>
                  <PlayerFocusPanel fixture={fixture} />
                </RegionBoundary>
              </div>
            </div>
          </div>
        </div>
      </main>
      <RegionBoundary region={R.evidence}>
        <EvidenceDrawer roster={roster} />
      </RegionBoundary>
      <LiveAnnouncer />
      <EditorialNotice />
    </>
  );
}
