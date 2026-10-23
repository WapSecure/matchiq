import type { Locale } from '@matchiq/contracts';
import { englishLanguageName } from '@/constants/match';
import { RECAP_COPY } from '@/constants/recap';
import type { RecapNarrativeView } from './pick-narrative';

export const recapTranslationNotice = (
  picked: RecapNarrativeView | null,
  locale: Locale,
): string | null => {
  if (picked?.translationUnknown) return RECAP_COPY.translationUnknown;
  if (picked?.fallback)
    return RECAP_COPY.localeFallback(englishLanguageName(locale));
  return null;
};
