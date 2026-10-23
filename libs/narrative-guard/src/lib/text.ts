import {
  COMBINING_MARKS,
  LEXICON_FLAGS,
  PYTHON_WORD_ESCAPE,
  SENTENCE_PATTERN,
  TOKEN_PATTERN,
  WORD_CHAR_CLASS,
} from './constants.js';

/**
 * Compiles a shared lexicon pattern the way the Python guard does:
 * case-insensitive, bounded by non-word characters, with Unicode `\w`.
 */
export const compilePattern = (pattern: string): RegExp => {
  const body = pattern.replace(PYTHON_WORD_ESCAPE, WORD_CHAR_CLASS);
  return new RegExp(
    `(?<!${WORD_CHAR_CLASS})(?:${body})(?!${WORD_CHAR_CLASS})`,
    LEXICON_FLAGS,
  );
};

export interface CompiledEntry<C extends string> {
  readonly category: C;
  readonly regex: RegExp;
}

export const compileLexicon = <C extends string>(
  lexicon: Readonly<Record<C, readonly string[]>>,
): CompiledEntry<C>[] =>
  (Object.entries(lexicon) as [C, readonly string[]][]).flatMap(
    ([category, patterns]) =>
      patterns.map((pattern) => ({ category, regex: compilePattern(pattern) })),
  );

export const compileAny = (patterns: readonly string[]): RegExp =>
  compilePattern(patterns.map((p) => `(?:${p})`).join('|'));

/** Lower-case tokens with diacritics folded, so "Grâce" and "grace" compare equal. */
export const normalisedTokens = (text: string): string[] =>
  [
    ...text
      .normalize('NFKD')
      .replace(COMBINING_MARKS, '')
      .toLowerCase()
      .matchAll(TOKEN_PATTERN),
  ].map((m) => m[0]);

export const sentencesOf = (text: string): string[] =>
  [...text.matchAll(SENTENCE_PATTERN)]
    .map((m) => m[0].trim())
    .filter((s) => s.length > 0);
