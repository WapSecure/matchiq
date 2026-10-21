import type {
  Locale,
  Narrative,
  OverlayCue,
  Persona,
} from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import { narrativeKey } from './reduce-insights';
import type { MatchData } from './types';

const DEFAULT_LOCALE: Locale = 'en-GB';
const BROADCAST: Persona = 'BROADCAST';

const ON_AIR_STATUSES = new Set<OverlayCue['status']>([
  'APPROVED',
  'AUTO_APPROVED',
  'SCHEDULED',
  'LIVE',
]);

export type NarrativeView = {
  narrative: Narrative;
  /** True when the requested locale is missing and en-GB is shown instead. */
  localeFallback: boolean;
};

export const selectNarrative = (
  state: Pick<MatchData, 'narratives'>,
  insightId: string,
  persona: Persona,
  locale: Locale,
): NarrativeView | null => {
  const variants = state.narratives[insightId];
  if (!variants) return null;
  const exact = variants[narrativeKey(persona, locale)];
  if (exact) return { narrative: exact, localeFallback: exact.localeFallback };
  const fallback = variants[narrativeKey(persona, DEFAULT_LOCALE)];
  return fallback ? { narrative: fallback, localeFallback: true } : null;
};

const isOnAir = (cue: OverlayCue, clockMs: number): boolean =>
  ON_AIR_STATUSES.has(cue.status) &&
  cue.clockStartMs <= clockMs &&
  clockMs < cue.clockEndMs;

/**
 * Cues visible on the preview at the current match clock for this audience.
 * Falls back to broadcast cues when none target the selected persona.
 */
export const selectActiveCues = (
  state: MatchData,
  persona: Persona,
  locale: Locale,
): OverlayCue[] => {
  const live: OverlayCue[] = [];
  for (const entry of Object.values(state.overlays)) {
    if (entry.cue && !entry.retracted && entry.cue.locale === locale) {
      if (isOnAir(entry.cue, state.clock.ms)) live.push(entry.cue);
    }
  }
  const forPersona = live.filter((cue) => cue.persona === persona);
  const chosen =
    forPersona.length > 0
      ? forPersona
      : live.filter((cue) => cue.persona === BROADCAST);
  return chosen
    .sort((a, b) => b.priority - a.priority)
    .slice(0, STORE_LIMITS.activeCuesMax);
};

export const selectInsight = (state: MatchData, insightId: string | null) =>
  insightId === null
    ? null
    : (state.insights.find((i) => i.insightId === insightId) ?? null);

export const selectEventsById = (state: MatchData, ids: readonly string[]) => {
  const wanted = new Set(ids);
  return state.timeline.filter((event) => wanted.has(event.eventId));
};
