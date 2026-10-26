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
import { FEATURED_SCENARIO } from '@/constants/lobby';
import { PAGE_SIZES } from '@/constants/pagination';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { useTemplates } from '@/lib/api/hooks';
import type { FixtureTemplateSummary } from '@/lib/api/session-schemas';
import { TemplateCard } from './template-card';

const SKELETON_CARDS = 2;
const GRID = 'grid gap-5 md:grid-cols-2';

function LobbySkeleton() {
  const copy = usePageMessages().lobby;
  return (
    <div role="status" aria-label={copy.loading} className={GRID}>
      {Array.from({ length: SKELETON_CARDS }, (_, i) => (
        <Skeleton key={i} className="h-[26rem] rounded-xl" />
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
  const copy = usePageMessages().lobby;
  const paging = useNumberedPage(PAGE_SIZES.lobbyDefault);
  const { pageSize } = paging;
  const page = clampPage(paging.page, totalPagesOf(templates.length, pageSize));
  const visible = featuredFirst(templates).slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  return (
    <div className="flex flex-col gap-5">
      <ul aria-label={copy.listLabel} className={GRID}>
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
        noun={copy.nouns.matches}
        label={copy.pagesLabel}
      />
    </div>
  );
}

export function TemplateLobby() {
  const copy = usePageMessages().lobby;
  const templates = useTemplates();
  if (templates.isPending) return <LobbySkeleton />;
  if (templates.isError) {
    return (
      <ErrorState
        title={copy.error}
        error={templates.error}
        onRetry={() => void templates.refetch()}
      />
    );
  }
  if (templates.data.length === 0) {
    return (
      <EmptyState
        Icon={TimelineIcon}
        title={copy.empty.title}
        description={copy.empty.description}
      />
    );
  }
  return <TemplatePages templates={templates.data} />;
}
