import type { Locale, Persona } from '@matchiq/contracts';
import { LIMITS } from '@matchiq/contracts';

/**
 * Mirrors the agents service's deterministic checker (apps/agents guard) so a
 * draft that passes there passes here; the worker gate stays authoritative.
 */
export const NUMERAL_PATTERN = /(?<![\w.,])\d+(?:[.,]\d+)?(?!\w)/g;
export const WORD_PATTERN = /\p{L}[\p{L}\p{M}\p{N}_'’-]*/gu;
export const NAME_TOKEN_PATTERN = /\p{L}+/gu;
export const SENTENCE_SPLIT_PATTERN = /\n+|(?<=[.!?:;…])\s+|\s+[—–]\s+/u;
export const UPPERCASE_START_PATTERN = /^\p{Lu}/u;
export const DECIMAL_COMMA = ',';
export const DECIMAL_POINT = '.';
export const FLOAT_TOLERANCE = 1e-9;

/** Capitalised words that are never entities. */
export const CAPITALISED_ALLOWED: ReadonlySet<string> = new Set([
  'VAR',
  'MatchIQ',
]);

const ENGLISH_NUMBER_WORDS: Readonly<Record<string, number>> = {
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

/**
 * Nigerian Pidgin uses English number words plus phonetic spellings. "one",
 * "un", "uno" and "wan" are omitted: they double as articles ("wan" also
 * means "want"). "fo" stays: copy and prompts spell "for" in full.
 */
export const NUMBER_WORDS: Readonly<
  Record<Locale, Readonly<Record<string, number>>>
> = {
  'en-GB': ENGLISH_NUMBER_WORDS,
  'fr-FR': {
    deux: 2,
    trois: 3,
    quatre: 4,
    cinq: 5,
    six: 6,
    sept: 7,
    huit: 8,
    neuf: 9,
    dix: 10,
    onze: 11,
    douze: 12,
    treize: 13,
    quatorze: 14,
    quinze: 15,
    seize: 16,
    vingt: 20,
  },
  'es-ES': {
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    dieciséis: 16,
    diecisiete: 17,
    dieciocho: 18,
    diecinueve: 19,
    veinte: 20,
  },
  'pcm-NG': {
    ...ENGLISH_NUMBER_WORDS,
    tu: 2,
    tri: 3,
    fo: 4,
    faiv: 5,
    siks: 6,
    sevin: 7,
    et: 8,
    nain: 9,
  },
};

export interface TextLimits {
  readonly headlineMax: number;
  readonly bodyMax: number;
  readonly maxSentences?: number;
}

export const CASUAL_BODY_MAX = 200;

export const PERSONA_LIMITS: Readonly<Record<Persona, TextLimits>> = {
  CASUAL: {
    headlineMax: LIMITS.narrativeHeadlineMax,
    bodyMax: CASUAL_BODY_MAX,
    maxSentences: 1,
  },
  ANALYST: {
    headlineMax: LIMITS.narrativeHeadlineMax,
    bodyMax: LIMITS.narrativeBodyMax,
  },
  BROADCAST: {
    headlineMax: LIMITS.overlayHeadlineMax,
    bodyMax: LIMITS.overlayBodyMax,
  },
};

export const OVERLAY_LIMITS: TextLimits = {
  headlineMax: LIMITS.overlayHeadlineMax,
  bodyMax: LIMITS.overlayBodyMax,
};

export const SENTENCE_END_PATTERN = /(?<=[.!?…])\s+/u;
