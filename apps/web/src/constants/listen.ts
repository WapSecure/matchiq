import type { Locale } from '@matchiq/contracts';

/**
 * Device voice languages tried for each narrative language. Nigerian Pidgin
 * only ever uses a Nigerian English voice, never a French or Spanish one.
 */
export const VOICE_LANGUAGES: Record<Locale, readonly string[]> = {
  'en-GB': ['en-GB'],
  'fr-FR': ['fr-FR'],
  'es-ES': ['es-ES'],
  'pcm-NG': ['en-NG'],
};

/** Languages that may fall back to another region of the same language. */
export const REGIONAL_FALLBACK: ReadonlySet<Locale> = new Set([
  'en-GB',
  'fr-FR',
  'es-ES',
]);

export const SENTENCE_END = /[.!?…]$/;

export const LISTEN_COPY = {
  listen: 'Listen',
  stop: 'Stop',
  listenTo: (headline: string) => `Listen to: ${headline}`,
  stopListening: (headline: string) => `Stop listening: ${headline}`,
  deviceVoice: "Uses your device's voice",
  started: 'Reading aloud',
  stopped: 'Stopped',
  finished: 'Finished reading',
  unavailable: (language: string) => `Audio is not available for ${language}`,
} as const;
