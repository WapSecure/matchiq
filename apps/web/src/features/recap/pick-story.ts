import type { Locale, MatchStory, Persona } from '@matchiq/contracts';
import {
  DEFAULT_COMMENTARY_LOCALE,
  englishLanguageName,
} from '@/constants/match';
import { RECAP_COPY } from '@/constants/recap';

export type MatchStoryView = {
  story: MatchStory;
  language: Locale;
  /** Shown when the chosen language is missing and English is used instead. */
  notice: string | null;
};

/** The story for one audience and language, else that audience's English story. */
export const pickStory = (
  stories: readonly MatchStory[] | undefined,
  persona: Persona,
  locale: Locale,
): MatchStoryView | null => {
  const forPersona = (stories ?? []).filter((s) => s.persona === persona);
  const exact = forPersona.find((s) => s.locale === locale);
  if (exact) return { story: exact, language: exact.locale, notice: null };
  const base = forPersona.find((s) => s.locale === DEFAULT_COMMENTARY_LOCALE);
  return base
    ? {
        story: base,
        language: DEFAULT_COMMENTARY_LOCALE,
        notice: RECAP_COPY.localeFallback(englishLanguageName(locale)),
      }
    : null;
};
