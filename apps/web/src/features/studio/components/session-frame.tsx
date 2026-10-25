'use client';

import type { Fixture } from '@matchiq/contracts';
import type { ReactNode } from 'react';
import { ErrorState } from '@/components/feedback';
import { Skeleton } from '@/components/ui';
import { HTTP_STATUS } from '@/constants/api';
import type { StudioView } from '@/constants/navigation';
import { MAIN_CONTENT_ID } from '@/constants/site';
import { STUDIO_COPY } from '@/constants/studio';
import { isApiError } from '@/lib/api/api-error';
import { useFixture } from '@/lib/api/hooks';
import { useMatchLabel } from '@/lib/use-match-label';
import { StudioHeader } from './studio-header';

type SessionFrameProps = {
  fixtureId: string;
  view: StudioView;
  status?: ReactNode;
  tabsAction?: ReactNode;
  banner?: ReactNode;
  children: (fixture: Fixture) => ReactNode;
};

function FrameSkeleton() {
  return (
    <main
      id={MAIN_CONTENT_ID}
      aria-busy="true"
      className="mx-auto grid max-w-[1920px] gap-4 p-4 lg:grid-cols-3 lg:px-6"
    >
      <Skeleton className="h-20 lg:col-span-3" />
      <Skeleton className="h-96 lg:col-span-2" />
      <Skeleton className="h-96" />
    </main>
  );
}

/** Header, tabs and fixture loading states shared by every session view. */
export function SessionFrame({
  fixtureId,
  view,
  status,
  tabsAction,
  banner,
  children,
}: SessionFrameProps) {
  const fixture = useFixture(fixtureId);
  const label = useMatchLabel(fixtureId);
  const missing =
    isApiError(fixture.error) && fixture.error.status === HTTP_STATUS.notFound;
  return (
    <>
      <StudioHeader
        fixtureId={fixtureId}
        view={view}
        title={fixture.data?.title ?? null}
        competition={fixture.data?.competitionLabel ?? null}
        matchCode={label.code}
        replay={label.replay}
        status={status}
        tabsAction={tabsAction}
      />
      {banner}
      {fixture.data ? children(fixture.data) : null}
      {fixture.isPending ? <FrameSkeleton /> : null}
      {fixture.isError ? (
        <main id={MAIN_CONTENT_ID} className="mx-auto max-w-3xl p-6">
          <ErrorState
            title={missing ? STUDIO_COPY.notFound : STUDIO_COPY.loadError}
            error={fixture.error}
            onRetry={() => void fixture.refetch()}
          />
        </main>
      ) : null}
    </>
  );
}
