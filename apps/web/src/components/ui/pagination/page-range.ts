export type PageItem = number | 'gap-start' | 'gap-end';

export interface PageRange {
  readonly from: number;
  readonly to: number;
}

export const totalPagesOf = (total: number, pageSize: number): number =>
  Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

export const clampPage = (page: number, totalPages: number): number =>
  Math.min(Math.max(1, Math.trunc(page) || 1), Math.max(1, totalPages));

/** 1-based, inclusive item range shown on `page`; `{ 0, 0 }` when the list is empty. */
export const rangeOf = (
  page: number,
  pageSize: number,
  total: number,
): PageRange => {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (page - 1) * pageSize + 1;
  return { from: Math.min(from, total), to: Math.min(page * pageSize, total) };
};

const span = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);

/**
 * Page buttons with gaps, keeping the first and last page and `siblings` either
 * side of the current one: `1 … 4 5 6 … 12`. A gap that would hide a single
 * page shows that page instead, so the slot count stays at `2 * siblings + 5`
 * and the control keeps its width while paging.
 */
export const pageItems = (
  current: number,
  totalPages: number,
  siblings = 1,
): PageItem[] => {
  if (totalPages <= 2 * siblings + 5) return span(1, totalPages);
  const page = clampPage(current, totalPages);
  const start = Math.max(
    Math.min(page - siblings, totalPages - 2 * siblings - 2),
    3,
  );
  const end = Math.min(
    Math.max(page + siblings, 2 * siblings + 3),
    totalPages - 2,
  );
  return [
    1,
    start > 3 ? 'gap-start' : 2,
    ...span(start, end),
    end < totalPages - 2 ? 'gap-end' : totalPages - 1,
    totalPages,
  ];
};
