'use client';

import { type CountNoun, PAGINATION_COPY as C } from '@/constants/pagination';
import { cn } from '@/lib/cn';
import { totalPagesOf } from './page-range';
import { NAV_ROW, PageSummary, StepButton } from './pagination-parts';

export interface CursorPaginationProps {
  /** Items on this page. */
  shown: number;
  /** Items before this page; null when unknown (a page opened from a shared link). */
  offset: number | null;
  pageSize: number;
  total?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  noun: CountNoun;
  /** Names the navigation landmark, e.g. "Recent replay pages". */
  label: string;
  isLoading?: boolean;
  className?: string;
}

export const cursorSummary = ({
  shown,
  offset,
  total,
  noun,
}: Pick<CursorPaginationProps, 'shown' | 'offset' | 'total' | 'noun'>) => {
  if (total === undefined) return C.showingCount(shown, noun);
  if (offset === null || shown === 0) return C.showingOf(shown, total, noun);
  return C.showing(offset + 1, offset + shown, total, noun);
};

/** Previous and Next over a forward-only cursor API; the caller keeps the way back. */
export function CursorPagination(props: CursorPaginationProps) {
  const { offset, pageSize, total, isLoading = false } = props;
  const position =
    offset === null ? null : Math.floor(offset / Math.max(1, pageSize)) + 1;
  const pages = total === undefined ? null : totalPagesOf(total, pageSize);
  const single = !props.hasPrevious && !props.hasNext;
  return (
    <div className={cn(NAV_ROW, props.className)}>
      <PageSummary busy={isLoading}>{cursorSummary(props)}</PageSummary>
      {single ? null : (
        <nav aria-label={props.label}>
          <ul className="flex items-center gap-1">
            <li>
              <StepButton
                direction="previous"
                isDisabled={!props.hasPrevious || isLoading}
                onPress={props.onPrevious}
              />
            </li>
            {position === null ? null : (
              <li className="tabular whitespace-nowrap px-2 text-xs font-medium text-ink">
                {pages === null
                  ? C.page(position)
                  : C.pageOf(position, Math.max(pages, position))}
              </li>
            )}
            <li>
              <StepButton
                direction="next"
                isDisabled={!props.hasNext || isLoading}
                onPress={props.onNext}
              />
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
