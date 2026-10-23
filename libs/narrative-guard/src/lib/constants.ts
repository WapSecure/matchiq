import type { Locale } from '@matchiq/contracts';

export const WORD_CHAR_CLASS = String.raw`[\p{L}\p{M}\p{N}_]`;
export const PYTHON_WORD_ESCAPE = /\\w/g;
export const LEXICON_FLAGS = 'iu';

export const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
export const COMBINING_MARKS = /\p{M}/gu;
export const SENTENCE_PATTERN = /[^.!?…\n]+[.!?…]*/gu;
export const LETTER_PATTERN = /\p{L}/gu;
export const UPPERCASE_LETTER_PATTERN = /\p{Lu}/gu;
export const WORD_PATTERN = /\p{L}+/gu;
export const UPPERCASE_WORD_PATTERN = /^\p{Lu}{2,}$/u;
export const EXCLAMATION = '!';
export const EXCLAMATION_RUN = /![!?]|\?!/u;

export const REPETITION = {
  /** Token Jaccard at or above this against a recent narrative is a repeat. */
  nearDuplicateJaccard: 0.8,
  /** A run of this many tokens seen twice in one field is a repeated phrase. */
  phraseTokens: 4,
  /** Below this many tokens a text is too short to judge as a repeat. */
  minTokens: 4,
} as const;

export const TONE = {
  maxExclamationsPerField: 1,
  /** Consecutive all-caps words (2+ letters) that read as shouting. */
  shoutingRun: 2,
  /** Share of upper-case letters that reads as shouting in a long enough field. */
  shoutingRatio: 0.7,
  shoutingMinLetters: 8,
} as const;

const ENGLISH_CAUSAL = [
  String.raw`because(?:\s+of)?`,
  String.raw`led\s+to`,
  String.raw`lead(?:s|ing)?\s+to`,
  String.raw`caus(?:ed|es|ing)`,
  String.raw`thanks\s+to`,
  String.raw`due\s+to`,
  String.raw`owing\s+to`,
  String.raw`as\s+a\s+result(?:\s+of)?`,
  String.raw`result(?:ed|s)\s+in`,
  String.raw`(?:which|that)\s+is\s+why`,
  String.raw`that's\s+why`,
];

/**
 * Causal connectives per locale. English is checked in every locale: one
 * localisation call writes them all, so English can leak into any of them.
 */
export const CAUSAL_CONNECTIVES: Readonly<Record<Locale, readonly string[]>> = {
  'en-GB': ENGLISH_CAUSAL,
  'fr-FR': [
    ...ENGLISH_CAUSAL,
    String.raw`parce\s+qu(?:e|')`,
    String.raw`gr[âa]ce\s+(?:à|au|aux)`,
    String.raw`à\s+cause\s+(?:de|du|des|d')`,
    String.raw`en\s+raison\s+(?:de|du|des|d')`,
    String.raw`(?:a|ont)\s+(?:provoqué|causé|entraîné)`,
    String.raw`(?:provoqué|causé)e?s?\s+par`,
    String.raw`c'est\s+pourquoi`,
    String.raw`ce\s+qui\s+explique`,
  ],
  'es-ES': [
    ...ENGLISH_CAUSAL,
    'porque',
    String.raw`gracias\s+a`,
    String.raw`debido\s+a`,
    String.raw`a\s+causa\s+de`,
    'provoc[óo]',
    'caus[óo]',
    String.raw`(?:llev[óo]|condujo)\s+a`,
    String.raw`por\s+eso`,
    String.raw`como\s+resultado(?:\s+de)?`,
  ],
  'pcm-NG': [
    ...ENGLISH_CAUSAL,
    'bikos',
    'becos',
    String.raw`sake\s+of`,
    String.raw`na\s+(?:im|dat|dis|wetin|why)\s+(?:make|cause)`,
    String.raw`na\s+why`,
  ],
};

const PASS = 'pass';

const ENGLISH_EVENTS = [
  'goals?',
  'shots?',
  'saves?',
  'corners?',
  String.raw`(?:yellow|red)\s+cards?`,
  'cards?',
  'penalt(?:y|ies)',
  'fouls?',
  'passes',
  'pass',
  'crosses',
  'cross',
  'tackles?',
  'headers?',
  'interceptions?',
  'recover(?:y|ies)',
  'substitutions?',
  String.raw`free[\s-]kicks?`,
  'possession',
  'pressing',
];

/** Nouns naming a recorded match event or metric; a causal sentence must name one. */
export const EVENT_TERMS: Readonly<Record<Locale, readonly string[]>> = {
  'en-GB': ENGLISH_EVENTS,
  'fr-FR': [
    ...ENGLISH_EVENTS,
    'buts?',
    'tirs?',
    'arr[êe]ts?',
    'corners?',
    'cartons?',
    'penaltys?',
    'fautes?',
    'passes?',
    'centres?',
    'tacles?',
    String.raw`t[êe]tes?`,
    'interceptions?',
    'r[ée]cup[ée]rations?',
    'remplacements?',
    String.raw`coups?\s+francs?`,
    'possession',
    'pressing',
  ],
  'es-ES': [
    ...ENGLISH_EVENTS,
    'gol(?:es)?',
    'tiros?',
    'disparos?',
    'paradas?',
    'c[óo]rners?',
    String.raw`saques?\s+de\s+esquina`,
    'tarjetas?',
    'penaltis?',
    'faltas?',
    'pases?',
    'centros?',
    'entradas?',
    'cabezazos?',
    'intercepciones?',
    'recuperaci(?:ón|ones)',
    'cambios?',
    'posesi[óo]n',
    'presi[óo]n',
  ],
  // Pidgin "pass" also means "more than" ("dem hungry pass"), so only the plural counts.
  'pcm-NG': ENGLISH_EVENTS.filter((term) => term !== PASS),
};
