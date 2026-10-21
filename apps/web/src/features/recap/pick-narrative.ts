import type { Locale, Persona } from '@matchiq/contracts';
import type { RecapNarrative } from '@/lib/api/session-schemas';

const DEFAULT_LOCALE: Locale = 'en-GB';

/** The persona's narrative in `locale`, else its en-GB text flagged as a fallback. */
export const pickNarrative = (
  narratives: readonly RecapNarrative[],
  persona: Persona,
  locale: Locale,
): { narrative: RecapNarrative; fallback: boolean } | null => {
  const forPersona = narratives.filter((n) => n.persona === persona);
  const exact = forPersona.find((n) => n.locale === locale);
  if (exact) return { narrative: exact, fallback: false };
  const base = forPersona.find((n) => n.locale === DEFAULT_LOCALE);
  return base ? { narrative: base, fallback: true } : null;
};
