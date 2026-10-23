import {
  EXCLAMATION,
  EXCLAMATION_RUN,
  LETTER_PATTERN,
  TONE,
  UPPERCASE_LETTER_PATTERN,
  UPPERCASE_WORD_PATTERN,
  WORD_PATTERN,
} from './constants.js';
import type { GuardFinding, ToneReason } from './findings.js';
import { SAFETY_LEXICON } from './lexicon.js';
import { compileLexicon } from './text.js';

const SAFETY = compileLexicon(SAFETY_LEXICON);

const finding = (reason: ToneReason, excerpt: string): GuardFinding => ({
  rule: 'UNSAFE_TONE',
  reason,
  excerpt,
});

const countOf = (text: string, pattern: RegExp): number =>
  [...text.matchAll(pattern)].length;

/** A run of all-caps words, or a field that is mostly capitals, ignoring allowed names. */
const shouting = (
  field: string,
  allowed: ReadonlySet<string>,
): string | null => {
  const words = [...field.matchAll(WORD_PATTERN)]
    .map((m) => m[0])
    .filter((w) => !allowed.has(w));
  let run: string[] = [];
  for (const word of words) {
    run = UPPERCASE_WORD_PATTERN.test(word) ? [...run, word] : [];
    if (run.length >= TONE.shoutingRun) return run.join(' ');
  }
  const letters = words.join('');
  const total = countOf(letters, LETTER_PATTERN);
  if (total < TONE.shoutingMinLetters) return null;
  const upper = countOf(letters, UPPERCASE_LETTER_PATTERN);
  return upper / total >= TONE.shoutingRatio ? field : null;
};

const exclamation = (field: string): string | null => {
  const run = EXCLAMATION_RUN.exec(field);
  if (run !== null) return run[0];
  const count = field.split(EXCLAMATION).length - 1;
  return count > TONE.maxExclamationsPerField ? field : null;
};

/**
 * Broadcast tone per field (headline, body): blocklisted profanity, slurs and
 * abuse, shouting in capitals, and excessive exclamation marks. `allowed`
 * holds names and terms that are legitimately written in capitals.
 */
export const toneFindings = (
  fields: readonly string[],
  allowed: ReadonlySet<string>,
): GuardFinding[] => {
  const found = new Map<ToneReason, string>();
  const text = fields.join('\n');
  for (const { category, regex } of SAFETY) {
    const match = regex.exec(text);
    if (match !== null && !found.has(category)) found.set(category, match[0]);
  }
  for (const field of fields) {
    const shout = shouting(field, allowed);
    if (shout !== null && !found.has('shouting')) found.set('shouting', shout);
    const bang = exclamation(field);
    if (bang !== null && !found.has('exclamation'))
      found.set('exclamation', bang);
  }
  return [...found].map(([reason, excerpt]) => finding(reason, excerpt));
};
