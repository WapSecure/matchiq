import type { EntityAllowlist, Locale } from '@matchiq/contracts';
import {
  CAPITALISED_ALLOWED,
  DECIMAL_COMMA,
  DECIMAL_POINT,
  FLOAT_TOLERANCE,
  NAME_TOKEN_PATTERN,
  NUMBER_WORDS,
  NUMERAL_PATTERN,
  SENTENCE_END_PATTERN,
  SENTENCE_SPLIT_PATTERN,
  UPPERCASE_START_PATTERN,
  WORD_PATTERN,
} from './gate.constants';

export interface Numeral {
  readonly raw: string;
  readonly value: number;
  readonly decimals: number;
}

const parseNumeral = (raw: string): Numeral => {
  const normalised = raw.replace(DECIMAL_COMMA, DECIMAL_POINT);
  const [, fraction] = normalised.split(DECIMAL_POINT);
  return { raw, value: Number(normalised), decimals: fraction?.length ?? 0 };
};

/** Digits plus spelled-out numbers in the text's locale. */
export const extractNumerals = (text: string, locale: Locale): Numeral[] => {
  const digits = [...text.matchAll(NUMERAL_PATTERN)].map((m) =>
    parseNumeral(m[0]),
  );
  const words = NUMBER_WORDS[locale];
  const spelled = [...text.matchAll(WORD_PATTERN)].flatMap((m) => {
    const value = words[m[0].toLowerCase()];
    return value === undefined ? [] : [{ raw: m[0], value, decimals: 0 }];
  });
  return [...digits, ...spelled];
};

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(Math.abs(value) * factor) / factor;
};

/** True when `value`, rounded to the numeral's precision, is what the text shows. */
export const represents = (numeral: Numeral, value: number): boolean =>
  Math.abs(numeral.value - round(value, numeral.decimals)) < FLOAT_TOLERANCE;

export const unsupportedNumerals = (
  text: string,
  locale: Locale,
  supported: readonly number[],
): string[] =>
  extractNumerals(text, locale)
    .filter((n) => !supported.some((value) => represents(n, value)))
    .map((n) => n.raw);

const nameTokens = (name: string): string[] =>
  [...name.matchAll(NAME_TOKEN_PATTERN)].map((m) => m[0]);

export const allowedNameTokens = (entities: EntityAllowlist): Set<string> =>
  new Set([
    ...entities.teams.flatMap((t) => nameTokens(t.name)),
    ...entities.players.flatMap((p) => nameTokens(p.displayName)),
    ...CAPITALISED_ALLOWED,
  ]);

/**
 * Capitalised tokens that are neither allowlisted names nor glossary terms.
 * The first word of each sentence is exempt: capitalisation there carries no signal.
 */
export const unknownCapitalised = (
  text: string,
  allowed: ReadonlySet<string>,
): string[] => {
  const unknown = new Set<string>();
  for (const sentence of text.split(SENTENCE_SPLIT_PATTERN)) {
    const words = [...sentence.matchAll(WORD_PATTERN)].map((m) => m[0]);
    for (const token of words.slice(1).flatMap(nameTokens)) {
      if (UPPERCASE_START_PATTERN.test(token) && !allowed.has(token)) {
        unknown.add(token);
      }
    }
  }
  return [...unknown];
};

export const sentenceCount = (body: string): number =>
  body
    .trim()
    .split(SENTENCE_END_PATTERN)
    .filter((part) => part.length > 0).length;
