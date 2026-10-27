'use client';

import { MoreIcon } from '@/components/icons';
import type { CountNoun } from '@/constants/pagination';
import { useInterfaceMessages } from '@/features/interface-language/interface-language-store';
import type { InterfaceMessages } from '@/features/interface-language/interface-messages';
import { cn } from '@/lib/cn';
import { Select } from '../select';
import { clampPage, pageItems, rangeOf, totalPagesOf } from './page-range';
import { NAV_ROW, PageSummary, StepButton } from './pagination-parts';

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  noun: CountNoun;
  /** Names the navigation landmark, e.g. "Match pages". */
  label: string;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  isLoading?: boolean;
  className?: string;
}

const PAGE_BUTTON =
  'press tabular inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-[13px] transition-colors duration-150 pointer-coarse:h-11 pointer-coarse:min-w-11';
const IDLE_PAGE =
  'font-medium text-ink-muted hover:bg-surface-raised hover:text-ink';
const CURRENT_PAGE = 'bg-accent font-semibold text-accent-ink shadow-panel';

function PageList({
  page,
  pages,
  onPageChange,
  copy,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  copy: InterfaceMessages['pagination'];
}) {
  return pageItems(page, pages).map((item) => {
    if (typeof item !== 'number') {
      return (
        <li key={item} aria-hidden className="hidden sm:block">
          <span className="flex h-8 min-w-6 items-center justify-center text-ink-subtle">
            <MoreIcon size={14} />
          </span>
        </li>
      );
    }
    const current = item === page;
    return (
      <li key={item} className="hidden sm:block">
        <button
          type="button"
          aria-label={copy.goToPage(item)}
          aria-current={current ? 'page' : undefined}
          onClick={() => {
            if (!current) onPageChange(item);
          }}
          className={cn(PAGE_BUTTON, current ? CURRENT_PAGE : IDLE_PAGE)}
        >
          {item}
        </button>
      </li>
    );
  });
}

function PageSizeSelect({
  pageSize,
  options,
  onChange,
  copy,
}: {
  pageSize: number;
  options: readonly number[];
  onChange: (size: number) => void;
  copy: InterfaceMessages['pagination'];
}) {
  return (
    <Select
      label={copy.perPage}
      hideLabel
      className="w-28 sm:w-34"
      value={String(pageSize)}
      onChange={(id) => onChange(Number(id))}
      options={options.map((size) => ({
        id: String(size),
        label: copy.perPageOption(size),
      }))}
    />
  );
}

/** Numbered pages for a list with a known total: `‹ 1 … 4 5 6 … 12 ›`, "Page 2 of 3" on phones. */
export function Pagination(props: PaginationProps) {
  const copy = useInterfaceMessages().pagination;
  const { pageSize, total, noun, label, isLoading = false } = props;
  const pages = totalPagesOf(total, pageSize);
  const page = clampPage(props.page, pages);
  const { from, to } = rangeOf(page, pageSize, total);
  const sizes = props.pageSizeOptions ?? [];
  const canResize =
    props.onPageSizeChange !== undefined && total > Math.min(...sizes);
  return (
    <div className={cn(NAV_ROW, props.className)}>
      <PageSummary busy={isLoading}>
        {copy.showing(from, to, total, noun)}
      </PageSummary>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {canResize && props.onPageSizeChange ? (
          <PageSizeSelect
            pageSize={pageSize}
            options={sizes}
            onChange={props.onPageSizeChange}
            copy={copy}
          />
        ) : null}
        {pages > 1 ? (
          <nav aria-label={label}>
            <ul className="flex items-center gap-1">
              <li>
                <StepButton
                  direction="previous"
                  isDisabled={page <= 1}
                  onPress={() => props.onPageChange(page - 1)}
                />
              </li>
              <PageList
                page={page}
                pages={pages}
                onPageChange={props.onPageChange}
                copy={copy}
              />
              <li
                data-testid="page-of"
                className="tabular whitespace-nowrap px-2 text-xs font-medium text-ink sm:hidden"
              >
                {copy.pageOf(page, pages)}
              </li>
              <li>
                <StepButton
                  direction="next"
                  isDisabled={page >= pages}
                  onPress={() => props.onPageChange(page + 1)}
                />
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
