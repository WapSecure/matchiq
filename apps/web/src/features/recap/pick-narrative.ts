import type { Locale, Persona } from '@matchiq/contracts';
import { DEFAULT_COMMENTARY_LOCALE } from '@/constants/match';
import { UNKNOWN_COMMENTARY_LANGUAGE } from '@/constants/recap';
import type { RecapNarrative } from '@/lib/api/session-schemas';

export type RecapNarrativeView = {
  narrative: RecapNarrative;
  fallback: boolean;
  translationUnknown: boolean;
  language: Locale | typeof UNKNOWN_COMMENTARY_LANGUAGE;
};

const viewOf = (
  narrative: RecapNarrative,
  fallback: boolean,
): RecapNarrativeView => {
  const translationUnknown =
    narrative.locale !== DEFAULT_COMMENTARY_LOCALE &&
    narrative.localeFallback === undefined;
  return {
    narrative,
    fallback: fallback || narrative.localeFallback === true,
    translationUnknown,
    language: translationUnknown
      ? UNKNOWN_COMMENTARY_LANGUAGE
      : narrative.localeFallback
        ? DEFAULT_COMMENTARY_LOCALE
        : narrative.locale,
  };
};

export const pickNarrative = (
  narratives: readonly RecapNarrative[],
  persona: Persona,
  locale: Locale,
): RecapNarrativeView | null => {
  const forPersona = narratives.filter((n) => n.persona === persona);
  const exact = forPersona.find((n) => n.locale === locale);
  if (exact) return viewOf(exact, false);
  const base = forPersona.find((n) => n.locale === DEFAULT_COMMENTARY_LOCALE);
  return base ? viewOf(base, true) : null;
};
