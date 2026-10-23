import type { Locale } from '@matchiq/contracts';
import { CAUSAL_CONNECTIVES, EVENT_TERMS } from './constants.js';
import type { GuardFinding } from './findings.js';
import { compileAny, sentencesOf } from './text.js';

const compileByLocale = (
  table: Readonly<Record<Locale, readonly string[]>>,
): Record<Locale, RegExp> => ({
  'en-GB': compileAny(table['en-GB']),
  'fr-FR': compileAny(table['fr-FR']),
  'es-ES': compileAny(table['es-ES']),
  'pcm-NG': compileAny(table['pcm-NG']),
});

const CAUSAL = compileByLocale(CAUSAL_CONNECTIVES);
const EVENTS = compileByLocale(EVENT_TERMS);

/** True when the sentence names a recorded event type ("goal", "tir", "parada"). */
export const mentionsEvent = (sentence: string, locale: Locale): boolean =>
  EVENTS[locale].test(sentence);

/**
 * Causal claims ("because", "grâce à", "porque", "na im make") the evidence
 * cannot back. A causal sentence passes only when `grounded` says it cites an
 * evidence-backed metric or event; the gate supplies that test because it
 * owns the cited values. Deliberately conservative: a sentence with no
 * connective is never flagged.
 */
export const causalityFindings = (
  text: string,
  locale: Locale,
  grounded: (sentence: string) => boolean,
): GuardFinding[] =>
  sentencesOf(text).flatMap((sentence) => {
    const match = CAUSAL[locale].exec(sentence);
    if (match === null || grounded(sentence)) return [];
    return [
      {
        rule: 'UNSUPPORTED_CAUSALITY' as const,
        reason: match[0].toLowerCase(),
        excerpt: sentence,
      },
    ];
  });
