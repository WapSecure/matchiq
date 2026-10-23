'use client';

import { useEffect } from 'react';
import { EmptyState, ErrorState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { Panel } from '@/components/ui';
import {
  CursorPagination,
  SkeletonRows,
  useCursorPage,
} from '@/components/ui/pagination';
import { PROBLEM_SLUGS } from '@/constants/api';
import { LOBBY_COPY } from '@/constants/lobby';
import { PAGE_SIZES, PAGINATION_NOUNS } from '@/constants/pagination';
import { isApiError } from '@/lib/api/api-error';
import { useSessionsPage, useTemplates } from '@/lib/api/hooks';
import { cn } from '@/lib/cn';
import { templateCode } from '@/lib/use-match-label';
import { SessionGroups } from './session-groups';

const copy = LOBBY_COPY.sessions;
const LIST = 'recent-replays';
const PAGE_SIZE = PAGE_SIZES.replays;

const isStaleLink = (error: unknown) =>
  isApiError(error) && error.problem.type.endsWith(PROBLEM_SLUGS.invalidCursor);

const useTemplateCodes = () => {
  const templates = useTemplates();
  const found = new Map((templates.data ?? []).map((t) => [t.templateId, t]));
  return (id: string) => {
    const template = found.get(id);
    return template ? templateCode(template) : undefined;
  };
};

function SessionsBody() {
  const paging = useCursorPage(LIST);
  const sessions = useSessionsPage({
    limit: PAGE_SIZE,
    ...(paging.cursor === null ? {} : { cursor: paging.cursor }),
  });
  const codeFor = useTemplateCodes();
  const stale = sessions.isError && isStaleLink(sessions.error);
  const { reset } = paging;
  // A shared link whose page no longer exists falls back to the newest replays.
  useEffect(() => {
    if (stale) reset();
  }, [stale, reset]);
  if (sessions.isPending || stale) {
    return (
      <SkeletonRows
        count={PAGE_SIZE}
        label={copy.loading}
        className="p-4"
        rowClassName="h-12"
      />
    );
  }
  if (sessions.isError) {
    return (
      <ErrorState
        className="m-4"
        title={copy.error}
        error={sessions.error}
        onRetry={() => void sessions.refetch()}
      />
    );
  }
  const { items, nextCursor, total } = sessions.data;
  if (items.length === 0 && paging.cursor === null) {
    return (
      <EmptyState
        compact
        Icon={TimelineIcon}
        title={copy.empty}
        className="m-4"
      />
    );
  }
  const loading = sessions.isPlaceholderData;
  return (
    <>
      <div
        role="group"
        aria-label={copy.listLabel}
        aria-busy={loading || undefined}
        className={cn(
          'transition-opacity duration-150',
          loading && 'opacity-60',
        )}
      >
        <SessionGroups sessions={items} codeFor={codeFor} />
      </div>
      <CursorPagination
        className="border-t border-line px-4 py-3 sm:px-5"
        shown={items.length}
        offset={paging.offset}
        pageSize={PAGE_SIZE}
        {...(total === undefined ? {} : { total })}
        hasPrevious={paging.hasPrevious}
        hasNext={nextCursor !== null}
        onPrevious={paging.goPrevious}
        onNext={() => {
          if (nextCursor !== null) paging.goNext(nextCursor, items.length);
        }}
        noun={PAGINATION_NOUNS.replays}
        label={copy.pagesLabel}
        isLoading={loading}
      />
    </>
  );
}

export function RecentSessions() {
  return (
    <Panel
      id="recent-sessions"
      title={copy.title}
      description={copy.description}
      Icon={TimelineIcon}
      bodyClassName="p-0!"
    >
      <SessionsBody />
    </Panel>
  );
}
