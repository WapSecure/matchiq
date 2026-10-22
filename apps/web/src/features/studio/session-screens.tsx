'use client';

import { AccessDenied } from '@/components/auth/access-denied';
import { RequirePermission } from '@/components/auth/require-permission';
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
      {(fixture) => (
        <RequirePermission
          permission="agents:traces:read"
          fallback={<AccessDenied className="m-4 lg:m-6" />}
        >
          <ObservatoryView fixture={fixture} />
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
          <AuditView fixture={fixture} />
        </RequirePermission>
      )}
    </SessionFrame>
  );
}
