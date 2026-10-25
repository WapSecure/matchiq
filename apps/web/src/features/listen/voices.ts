import type { Locale } from '@matchiq/contracts';
import { REGIONAL_FALLBACK, VOICE_LANGUAGES } from '@/constants/listen';

const normalise = (lang: string) => lang.replace('_', '-').toLowerCase();
const primary = (lang: string) => normalise(lang).split('-')[0];

/** The device voice for a narrative language, or null when none fits. */
export const chooseVoice = (
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null => {
  for (const wanted of VOICE_LANGUAGES[locale]) {
    const exact = voices.find((v) => normalise(v.lang) === normalise(wanted));
    if (exact) return exact;
  }
  if (!REGIONAL_FALLBACK.has(locale)) return null;
  const base = primary(locale);
  return voices.find((v) => primary(v.lang) === base) ?? null;
};

export const hasSpeech = (): boolean =>
  typeof window !== 'undefined' &&
  'speechSynthesis' in window &&
  typeof SpeechSynthesisUtterance !== 'undefined';
