'use client';

import type { OverlayReview, PublishPolicy } from '@matchiq/contracts';
import { EmptyState } from '@/components/feedback/empty-state';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { CheckIcon } from '@/components/icons';
import { Badge, Skeleton } from '@/components/ui';
import { APPROVAL_COPY } from '@/constants/approval';
import { useMatchStore } from '../store';
import { ReviewCard } from './review-card';
import { useReviewQueue } from './use-review-queue';

const HEADING_ID = 'approval-queue-title';

export const usePublishPolicy = (): PublishPolicy =>
  useMatchStore((s) => s.editorial?.publishPolicy?.policy ?? 'AUTO');

function Body({
  items,
  policy,
}: {
  items: readonly OverlayReview[];
  policy: PublishPolicy;
}) {
  if (items.length === 0) {
    const empty = APPROVAL_COPY.empty[policy];
    return (
      <EmptyState
        compact
        Icon={CheckIcon}
        title={empty.title}
        description={empty.body}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((review) => (
        <ReviewCard
          key={`${review.overlayId}:${review.revision}`}
          review={review}
        />
      ))}
    </ul>
  );
}

/**
 * Producer approval queue (spec §31.4, ADR-0023). Hidden from roles that
 * cannot approve; the API enforces the same permission.
 */
export function ApprovalQueue() {
  const { allowed, query } = useReviewQueue();
  const policy = usePublishPolicy();
  if (!allowed) return null;
  const items = query.data?.items ?? [];
  return (
    <section
      aria-labelledby={HEADING_ID}
      aria-busy={query.isPending || undefined}
      data-testid="approval-queue"
      className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
    >
      <div className="flex items-center gap-2">
        <h3 id={HEADING_ID} className="text-[13px] font-semibold text-ink">
          {APPROVAL_COPY.title}
        </h3>
        {items.length > 0 ? (
          <Badge tone="warning">{APPROVAL_COPY.count(items.length)}</Badge>
        ) : null}
      </div>
      <p className="text-micro text-ink-subtle">{APPROVAL_COPY.description}</p>
      {query.isPending ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{APPROVAL_COPY.loading}</span>
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <InlineProblem
          error={query.error}
          lead={APPROVAL_COPY.loadError}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Body items={items} policy={policy} />
      )}
    </section>
  );
}
