import type { Locale, Narrative } from '@matchiq/contracts';
import { DEFAULT_COMMENTARY_LOCALE } from '@/constants/match';

export const narrativeLanguage = (
  narrative: Pick<Narrative, 'locale' | 'localeFallback'>,
): Locale =>
  narrative.localeFallback ? DEFAULT_COMMENTARY_LOCALE : narrative.locale;
