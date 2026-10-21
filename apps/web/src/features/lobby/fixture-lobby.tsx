'use client';

import { EmptyState, ErrorState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { LOBBY_COPY } from '@/constants/lobby';
import { useFixtures } from '@/lib/api/hooks';
import { FixtureCard } from './fixture-card';

const SKELETON_CARDS = 3;

function LobbySkeleton() {
  return (
    <div
      role="status"
      aria-label={LOBBY_COPY.loading}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Skeleton key={i} className="h-72 rounded-lg" />
      ))}
    </div>
  );
}

export function FixtureLobby() {
  const fixtures = useFixtures();
  if (fixtures.isPending) return <LobbySkeleton />;
  if (fixtures.isError) {
    return (
      <ErrorState
        title={LOBBY_COPY.error.title}
        error={fixtures.error}
        onRetry={() => void fixtures.refetch()}
      />
    );
  }
  if (fixtures.data.length === 0) {
    return (
      <EmptyState
        Icon={TimelineIcon}
        title={LOBBY_COPY.empty.title}
        description={LOBBY_COPY.empty.description}
      />
    );
  }
  return (
    <ul
      aria-label={LOBBY_COPY.listLabel}
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {fixtures.data.map((fixture) => (
        <li key={fixture.fixtureId} className="flex min-w-0">
          <FixtureCard fixture={fixture} />
        </li>
      ))}
    </ul>
  );
}
