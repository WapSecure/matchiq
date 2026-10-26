export const FIGURE_NUMERAL_PATTERN = /(?<![\w.,])\d+(?:[.,]\d+)?(?!\w)/g;
export const FIGURE_WORD_PATTERN = /\p{L}[\p{L}\p{M}\p{N}_'’-]*/gu;
export const FIGURE_DECIMAL_COMMA = /,/;
export const FIGURE_TOLERANCE = 1e-9;

const ENGLISH_WORDS: Readonly<Record<string, number>> = {
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  dozen: 12,
};

/** Languages whose spelled-out numbers the check can read; others show no receipt. */
export const FIGURE_WORDS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = { 'en-GB': ENGLISH_WORDS, 'pcm-NG': ENGLISH_WORDS };

export const NUMBERS_CHECKED_COPY = {
  casual: 'Numbers checked against the match data',
  broadcast: 'Checked',
  line: (n: number) =>
    n === 1
      ? 'The 1 figure matches the match data'
      : `All ${n} figures match the match data`,
  open: (headline: string) => `Show the figures checked for ${headline}`,
  listTitle: 'Figures checked',
  listIntro: 'Each figure in the wording and the stat it matches.',
  matches: 'matches',
} as const;
