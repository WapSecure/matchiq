/** Gallery specimens for `components/ui/pagination` on `/design-system`. */
export const PAGINATION_GALLERY = {
  section: 'Pagination',
  states: {
    numbered: 'Numbered, with page size',
    truncated: 'Many pages, truncated',
    cursor: 'Previous and next',
    cursorBusy: 'Previous and next, next page loading',
    loadMore: 'Show more',
    loadMoreBusy: 'Show more, loading',
    end: 'Show more, at the end',
    skeleton: 'Rows loading',
  },
  numberedLabel: 'Example pages',
  truncatedLabel: 'Example long list pages',
  cursorLabel: 'Example replay pages',
  moreLabel: 'More example entries',
  skeletonLabel: 'Loading example rows',
  total: 23,
  manyTotal: 140,
  manyPageSize: 10,
  feedShown: 50,
} as const;
