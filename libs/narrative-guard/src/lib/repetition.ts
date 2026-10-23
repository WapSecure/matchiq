import type { Locale, Persona } from '@matchiq/contracts';
import { REPETITION } from './constants.js';
import type { GuardFinding } from './findings.js';
import { normalisedTokens } from './text.js';

export interface PublishedText {
  readonly persona: Persona;
  readonly locale: Locale;
  readonly headline: string;
  readonly body: string;
}

/** |A ∩ B| / |A ∪ B| over distinct normalised tokens; 0 when both are empty. */
export const tokenJaccard = (a: string, b: string): number => {
  const left = new Set(normalisedTokens(a));
  const right = new Set(normalisedTokens(b));
  const union = new Set([...left, ...right]).size;
  if (union === 0) return 0;
  const shared = [...left].filter((t) => right.has(t)).length;
  return shared / union;
};

const combined = (t: Pick<PublishedText, 'headline' | 'body'>) =>
  `${t.headline}\n${t.body}`;

/**
 * A draft that is near-identical to a narrative already published for the
 * same persona and locale. The caller passes only the recent window.
 */
export const recentRepeat = (
  draft: PublishedText,
  recent: readonly PublishedText[],
): GuardFinding | null => {
  const text = combined(draft);
  if (normalisedTokens(text).length < REPETITION.minTokens) return null;
  const twin = recent.find(
    (r) =>
      r.persona === draft.persona &&
      r.locale === draft.locale &&
      tokenJaccard(text, combined(r)) >= REPETITION.nearDuplicateJaccard,
  );
  return twin === undefined
    ? null
    : {
        rule: 'REPETITION',
        reason: 'recent_narrative',
        excerpt: twin.headline,
      };
};

/** The first run of `phraseTokens` tokens that occurs twice within one field. */
const repeatedPhrase = (field: string): string | null => {
  const tokens = normalisedTokens(field);
  const n = REPETITION.phraseTokens;
  const seen = new Map<string, number>();
  for (let i = 0; i + n <= tokens.length; i += 1) {
    const phrase = tokens.slice(i, i + n).join(' ');
    const first = seen.get(phrase);
    // Overlapping runs ("a a a a a") are reduplication, not a repeated phrase.
    if (first !== undefined && i - first >= n) return phrase;
    if (first === undefined) seen.set(phrase, i);
  }
  return null;
};

export const phraseRepeats = (fields: readonly string[]): GuardFinding[] =>
  fields.flatMap((field) => {
    const phrase = repeatedPhrase(field);
    return phrase === null
      ? []
      : [
          {
            rule: 'REPETITION' as const,
            reason: 'repeated_phrase',
            excerpt: phrase,
          },
        ];
  });
