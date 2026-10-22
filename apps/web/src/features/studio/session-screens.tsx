'use client';

import { AuditView } from '@/features/audit/audit-view';
import { ObservatoryView } from '@/features/observatory/observatory-view';
import { RecapView } from '@/features/recap/recap-view';
import { SessionFrame } from './components/session-frame';

export function RecapScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="recap">
      {(fixture) => <RecapView fixture={fixture} />}
    </SessionFrame>
  );
}

export function ObservatoryScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="observatory">
      {(fixture) => <ObservatoryView fixture={fixture} />}
    </SessionFrame>
  );
}

export function AuditScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="audit">
      {(fixture) => <AuditView fixture={fixture} />}
    </SessionFrame>
  );
}
