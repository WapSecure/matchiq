'use client';

import { EmptyState, ErrorState } from '@/components/feedback';
import { TimelineIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui';
import { FEATURED_SCENARIO, LOBBY_COPY } from '@/constants/lobby';
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
  return (
    <ul aria-label={LOBBY_COPY.listLabel} className={GRID}>
      {featuredFirst(templates.data).map((template) => (
        <li key={template.templateId} className="flex min-w-0">
          <TemplateCard
            template={template}
            featured={template.scenario === FEATURED_SCENARIO}
          />
        </li>
      ))}
    </ul>
  );
}
