'use client';

import type { OverlayReview, PublishPolicy } from '@matchiq/contracts';
import { useRef, useState, type ComponentProps } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { InlineProblem } from '@/components/feedback/inline-problem';
import { CheckIcon } from '@/components/icons';
import { Badge, Skeleton } from '@/components/ui';
import { SETTLED_COPY } from '@/constants/approval-shortcuts';
import { APPROVAL_COPY } from '@/constants/approval';
import { usePageMessages } from '@/features/interface-language/use-page-messages';
import { useMatchStore } from '../store';
import { ReviewCard } from './review-card';
import { SettledCard } from './settled-card';
import { ShortcutsHelp } from './shortcuts-help';
import {
  useSettledReviews,
  reviewKey,
  type Settled,
} from './use-settled-reviews';
import { useQueueKeys } from './use-queue-keys';
import { useShortcutSetting } from './use-shortcut-setting';
import { useReviewQueue } from './use-review-queue';

const HEADING_ID = 'approval-queue-title';

export const usePublishPolicy = (): PublishPolicy =>
  useMatchStore((s) => s.editorial?.publishPolicy?.policy ?? 'AUTO');

type BodyProps = {
  items: readonly OverlayReview[];
  policy: PublishPolicy;
  offsetMs: number;
  shortcuts: boolean;
  settled: Record<string, Settled>;
  onSettle: ComponentProps<typeof ReviewCard>['onSettle'];
  onExpire: ComponentProps<typeof SettledCard>['onExpire'];
};

function Body({ items, policy, settled, onExpire, ...card }: BodyProps) {
  const state = usePageMessages().states.studio;
  const keys = new Set(items.map(reviewKey));
  const extras = Object.values(settled).filter((s) => !keys.has(s.key));
  if (items.length === 0 && extras.length === 0) {
    const empty = state.approvalEmpty[policy];
    return (
      <EmptyState
        compact
        Icon={CheckIcon}
        title={empty.title}
        description={empty.description}
      />
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((review) => {
        const entry = settled[reviewKey(review)];
        return entry ? (
          <SettledCard key={entry.key} entry={entry} onExpire={onExpire} />
        ) : (
          <ReviewCard key={reviewKey(review)} review={review} {...card} />
        );
      })}
      {extras.map((entry) => (
        <SettledCard key={entry.key} entry={entry} onExpire={onExpire} />
      ))}
    </ul>
  );
}

/**
 * Producer approval queue (spec §31.4, ADR-0024). Hidden from roles that
 * cannot approve; the API enforces the same permission.
 */
export function ApprovalQueue() {
  const { allowed, query } = useReviewQueue();
  const policy = usePublishPolicy();
  const [shortcuts, setShortcuts] = useShortcutSetting();
  const [helpOpen, setHelpOpen] = useState(false);
  const region = useRef<HTMLElement>(null);
  const items = query.data?.items ?? [];
  const offsetMs = query.data
    ? Date.parse(query.data.serverTime) - query.dataUpdatedAt
    : 0;
  const { settled, settle, forget, spoken } = useSettledReviews(offsetMs);
  const waiting = items.filter((r) => !settled[reviewKey(r)]).length;
  const { onExpire, onKeyDown } = useQueueKeys(region, shortcuts, forget, () =>
    setHelpOpen(true),
  );
  if (!allowed) return null;
  return (
    <section
      ref={region}
      tabIndex={-1}
      aria-labelledby={HEADING_ID}
      aria-busy={query.isPending || undefined}
      data-testid="approval-queue"
      onKeyDown={onKeyDown}
      className="mt-3 flex flex-col gap-2 border-t border-line pt-3 outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={HEADING_ID} className="text-[13px] font-semibold text-ink">
          {APPROVAL_COPY.title}
        </h3>
        {waiting > 0 ? (
          <Badge tone="warning">{APPROVAL_COPY.count(waiting)}</Badge>
        ) : null}
        <ShortcutsHelp
          enabled={shortcuts}
          onEnabledChange={setShortcuts}
          open={helpOpen}
          onOpenChange={setHelpOpen}
        />
      </div>
      <p className="text-micro text-ink-subtle">{APPROVAL_COPY.description}</p>
      <p
        role="status"
        aria-label={SETTLED_COPY.region}
        lang={spoken?.locale}
        className="sr-only"
      >
        {spoken?.text}
      </p>
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
        <Body
          items={items}
          policy={policy}
          offsetMs={offsetMs}
          shortcuts={shortcuts}
          settled={settled}
          onSettle={settle}
          onExpire={onExpire}
        />
      )}
    </section>
  );
}
