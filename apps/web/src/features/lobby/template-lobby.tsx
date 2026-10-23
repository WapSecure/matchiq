'use client';

import { EmptyState, ErrorState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import {
  clampPage,
  Pagination,
  totalPagesOf,
  useNumberedPage,
} from '@/components/ui/pagination';
import { FEATURED_SCENARIO, LOBBY_COPY } from '@/constants/lobby';
import { PAGE_SIZES, PAGINATION_NOUNS } from '@/constants/pagination';
import { useTemplates } from '@/lib/api/hooks';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { TemplateCard } from './template-card';

const SKELETON_CARDS = 3;
const GRID = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';

function LobbySkeleton() {
  return (
    <div role="status" aria-label={LOBBY_COPY.loading} className={GRID}>
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Skeleton key={i} className="h-72 rounded-lg" />
      ))}
    </div>
  );
}

/** The quick-start scenario leads; the rest keep the API's order. */
const featuredFirst = (
  templates: readonly FixtureTemplateSummary[],
): FixtureTemplateSummary[] => [
  ...templates.filter((t) => t.scenario === FEATURED_SCENARIO),
  ...templates.filter((t) => t.scenario !== FEATURED_SCENARIO),
];

/**
 * Numbered pages need random access, which keyset cursors do not give, so the
 * small catalogue is loaded whole (`fetchTemplates` follows `nextCursor`) and
 * paged here. The same cached query feeds match codes elsewhere.
 */
function TemplatePages({
  templates,
}: {
  templates: readonly FixtureTemplateSummary[];
}) {
  const paging = useNumberedPage(PAGE_SIZES.lobbyDefault);
  const { pageSize } = paging;
  const page = clampPage(paging.page, totalPagesOf(templates.length, pageSize));
  const visible = featuredFirst(templates).slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  return (
    <div className="flex flex-col gap-5">
      <ul aria-label={LOBBY_COPY.listLabel} className={GRID}>
        {visible.map((template) => (
          <li key={template.templateId} className="flex min-w-0">
            <TemplateCard
              template={template}
              featured={template.scenario === FEATURED_SCENARIO}
            />
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={templates.length}
        onPageChange={paging.setPage}
        pageSizeOptions={PAGE_SIZES.lobby}
        onPageSizeChange={paging.setPageSize}
        noun={PAGINATION_NOUNS.matches}
        label={LOBBY_COPY.pagesLabel}
      />
    </div>
  );
}

export function TemplateLobby() {
  const templates = useTemplates();
  if (templates.isPending) return <LobbySkeleton />;
  if (templates.isError) {
    return (
      <ErrorState
        title={LOBBY_COPY.error.title}
        error={templates.error}
        onRetry={() => void templates.refetch()}
      />
    );
  }
  if (templates.data.length === 0) {
    return (
      <EmptyState
        Icon={TimelineIcon}
        title={LOBBY_COPY.empty.title}
        description={LOBBY_COPY.empty.description}
      />
    );
  }
  return <TemplatePages templates={templates.data} />;
}
