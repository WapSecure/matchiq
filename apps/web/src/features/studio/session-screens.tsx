'use client';

import { AccessDenied } from '@/components/auth/access-denied';
import { RequirePermission } from '@/components/auth/require-permission';
import { RegionBoundary } from '@/components/feedback';
import { AuditView } from '@/features/audit/audit-view';
import { ObservatoryView } from '@/features/observatory/observatory-view';
import { RecapView } from '@/features/recap/recap-view';
import { SessionFrame } from './components/session-frame';

export function RecapScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="recap">
      {(fixture) => (
        <RegionBoundary region="recap" className="m-4 lg:m-6">
          <RecapView fixture={fixture} />
        </RegionBoundary>
      )}
    </SessionFrame>
  );
}

export function ObservatoryScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="observatory">
      {(fixture) => (
        <RequirePermission
          permission="agents:traces:read"
          fallback={<AccessDenied className="m-4 lg:m-6" />}
        >
          <RegionBoundary region="checks" className="m-4 lg:m-6">
            <ObservatoryView fixture={fixture} />
          </RegionBoundary>
        </RequirePermission>
      )}
    </SessionFrame>
  );
}

export function AuditScreen({ fixtureId }: { fixtureId: string }) {
  return (
    <SessionFrame fixtureId={fixtureId} view="audit">
      {(fixture) => (
        <RequirePermission
          permission="audit:read"
          fallback={<AccessDenied className="m-4 lg:m-6" />}
        >
          <RegionBoundary region="activity" className="m-4 lg:m-6">
            <AuditView fixture={fixture} />
          </RegionBoundary>
        </RequirePermission>
      )}
    </SessionFrame>
  );
}
