'use client';

import { SpinnerIcon } from '@/components/icons';
import type { CountNoun } from '@/constants/pagination';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import { cn } from '@/lib/cn';
import { Button } from '../button';
import { EDGE_DISABLED, PageSummary } from './pagination-parts';

export interface LoadMoreProps {
  shown: number;
  total?: number;
  hasMore: boolean;
  isLoading?: boolean;
  onLoadMore: () => void;
  noun: CountNoun;
  /** Names the navigation landmark, e.g. "More activity". */
  label: string;
  endMessage?: string;
  className?: string;
}

/** "Show more" for feeds: appends the next page below and keeps focus on the button. */
export function LoadMore(props: LoadMoreProps) {
  const { shown, total, noun, isLoading = false } = props;
  const copy = useInterfaceMessages().pagination;
  return (
    <nav
      aria-label={props.label}
      className={cn('flex flex-col items-center gap-2', props.className)}
    >
      <PageSummary busy={isLoading}>
        {total === undefined
          ? copy.showingCount(shown, noun)
          : copy.showingOf(shown, total, noun)}
      </PageSummary>
      {props.hasMore ? (
        <Button
          aria-disabled={isLoading || undefined}
          onClick={() => {
            if (!isLoading) props.onLoadMore();
          }}
          leadingIcon={isLoading ? <SpinnerIcon size={14} /> : undefined}
          className={cn('min-w-32 pointer-coarse:h-11', EDGE_DISABLED)}
        >
          {isLoading ? copy.loadingMore : copy.showMore}
        </Button>
      ) : (
        <p className="text-xs text-ink-subtle">
          {props.endMessage ?? copy.end}
        </p>
      )}
    </nav>
  );
}
