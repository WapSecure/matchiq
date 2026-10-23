import type { Narrative } from '@matchiq/contracts';
import type { InsightWithPeriod } from '@matchiq/db';
import type { PublishedText } from '@matchiq/narrative-guard';
import { REPETITION_WINDOW_MS } from './gate.constants';

/**
 * Narratives published for insights detected up to `windowMs` of match time
 * before `insightId`, in the same period (the match clock restarts each
 * period). The gate compares agent drafts against these for repetition.
 */
export const recentNarratives = (
  narratives: readonly Narrative[],
  insights: readonly InsightWithPeriod[],
  insightId: string,
  windowMs: number = REPETITION_WINDOW_MS,
): PublishedText[] => {
  const current = insights.find((i) => i.insight.insightId === insightId);
  if (current === undefined) return [];
  const clock = current.insight.matchClockMs;
  const inWindow = new Set(
    insights
      .filter(
        (i) =>
          i.insight.insightId !== insightId &&
          i.period === current.period &&
          i.insight.matchClockMs <= clock &&
          clock - i.insight.matchClockMs <= windowMs,
      )
      .map((i) => i.insight.insightId),
  );
  return narratives
    .filter((n) => inWindow.has(n.insightId))
    .map(({ persona, locale, headline, body }) => ({
      persona,
      locale,
      headline,
      body,
    }));
};
