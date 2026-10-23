/** A noun for a count: "1 match", "6 matches". */
export interface CountNoun {
  readonly one: string;
  readonly other: string;
}

export const nounFor = (count: number, noun: CountNoun): string =>
  count === 1 ? noun.one : noun.other;

const fmt = (n: number) => n.toLocaleString('en-GB');

/** Copy for `components/ui/pagination`; follows CONTENT_STYLE_GUIDE (en dash ranges, no "cursor"). */
export const PAGINATION_COPY = {
  previous: 'Previous',
  next: 'Next',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  goToPage: (page: number) => `Page ${fmt(page)}`,
  pageOf: (page: number, pages: number) => `Page ${fmt(page)} of ${fmt(pages)}`,
  page: (page: number) => `Page ${fmt(page)}`,
  showing: (from: number, to: number, total: number, noun: CountNoun) =>
    `Showing ${fmt(from)}–${fmt(to)} of ${fmt(total)} ${nounFor(total, noun)}`,
  showingCount: (count: number, noun: CountNoun) =>
    `Showing ${fmt(count)} ${nounFor(count, noun)}`,
  showingOf: (count: number, total: number, noun: CountNoun) =>
    `Showing ${fmt(count)} of ${fmt(total)} ${nounFor(total, noun)}`,
  perPage: 'Per page',
  perPageOption: (size: number) => `${fmt(size)} per page`,
  showMore: 'Show more',
  loadingMore: 'Loading more…',
  loadingPage: 'Loading the page',
  end: "You've reached the end.",
} as const;

export const PAGINATION_NOUNS = {
  matches: { one: 'match', other: 'matches' },
  replays: { one: 'replay', other: 'replays' },
  activity: { one: 'entry', other: 'entries' },
  moments: { one: 'key moment', other: 'key moments' },
} as const satisfies Record<string, CountNoun>;

export const PAGINATION_URL = {
  changeEvent: 'matchiq:url-params',
  after: 'after',
  numbered: { page: 'page', size: 'size' },
} as const;

export const PAGE_SIZES = {
  default: [8, 16, 32],
  lobby: [3, 6, 12],
  lobbyDefault: 6,
  replays: 8,
  feed: 12,
} as const;
