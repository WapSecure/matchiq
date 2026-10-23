'use client';

import { PAGINATION_URL } from '@/constants/pagination';
import { cursorTrailFor } from './cursor-trail';
import {
  setUrlParams,
  usePositiveIntParam,
  useUrlParam,
} from './use-url-param';

export interface CursorPageState {
  /** Null on the first page. */
  readonly cursor: string | null;
  /** Items before this page; null when the page was opened from a shared link. */
  readonly offset: number | null;
  readonly hasPrevious: boolean;
  goNext(nextCursor: string, shown: number): void;
  goPrevious(): void;
  /** Back to the first page without a history entry (for example after a stale link). */
  reset(): void;
}

/** `?after=<cursor>` for a cursor list, with a remembered way back. */
export const useCursorPage = (
  list: string,
  param: string = PAGINATION_URL.after,
): CursorPageState => {
  const cursor = useUrlParam(param);
  const trail = cursorTrailFor(list);
  return {
    cursor,
    offset: trail.offsetOf(cursor),
    hasPrevious: cursor !== null,
    goNext: (nextCursor, shown) => {
      trail.record(cursor, shown, nextCursor);
      setUrlParams({ [param]: nextCursor });
    },
    goPrevious: () => setUrlParams({ [param]: trail.previousOf(cursor) }),
    reset: () => setUrlParams({ [param]: null }, 'replace'),
  };
};

export interface NumberedPageState {
  readonly page: number;
  readonly pageSize: number;
  setPage(page: number): void;
  /** Changing the size returns to the first page. */
  setPageSize(size: number): void;
}

/** `?page=2&size=12`, omitting either when it is the default so shared links stay short. */
export const useNumberedPage = (
  defaultSize: number,
  keys: { page: string; size: string } = PAGINATION_URL.numbered,
): NumberedPageState => {
  const page = usePositiveIntParam(keys.page, 1);
  const pageSize = usePositiveIntParam(keys.size, defaultSize);
  return {
    page,
    pageSize,
    setPage: (next) =>
      setUrlParams({ [keys.page]: next <= 1 ? null : String(next) }),
    setPageSize: (size) =>
      setUrlParams({
        [keys.page]: null,
        [keys.size]: size === defaultSize ? null : String(size),
      }),
  };
};
