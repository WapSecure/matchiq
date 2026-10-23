'use client';

import { useEffect } from 'react';
import type { SseTransport } from '@/lib/stream';
import {
  ConnectionBanner,
  LiveConnection,
} from './components/connection-banner';
import { SessionFrame } from './components/session-frame';
import { EditorialBanner, EditorialChip } from './editorial/editorial-status';
import { useMatchStream } from './hooks/use-match-stream';
import { useStudioHydration } from './hooks/use-studio-hydration';
import { StudioGrid } from './studio-grid';
import { MatchStoreProvider, type MatchStore, useStudioUi } from './store';

type LiveStudioProps = {
  fixtureId: string;
  store?: MatchStore;
  transport?: SseTransport;
};

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
