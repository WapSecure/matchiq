import type { Insight, Narrative } from '@matchiq/contracts';
import { STORE_LIMITS } from '@/constants/api';
import type { MatchData } from './types';

export const narrativeKey = (persona: string, locale: string): string =>
  `${persona}:${locale}`;

/** Upserts by `insightId`; newest match-clock first, bounded. */
export const reduceInsight = (
  state: MatchData,
  insight: Insight,
): Partial<MatchData> => {
  const others = state.insights.filter(
    (i) => i.insightId !== insight.insightId,
  );
  const insights = [insight, ...others]
    .sort((a, b) => b.matchClockMs - a.matchClockMs)
    .slice(0, STORE_LIMITS.insightsMax);
  return { insights };
};

export const reduceNarrative = (
  state: MatchData,
  narrative: Narrative,
): Partial<MatchData> => {
  const key = narrativeKey(narrative.persona, narrative.locale);
  const variants = state.narratives[narrative.insightId] ?? {};
  const existing = variants[key];
  if (existing && existing.createdAt > narrative.createdAt) return {};
  return {
    narratives: {
      ...state.narratives,
      [narrative.insightId]: { ...variants, [key]: narrative },
    },
  };
};
