import type { Insight, Narrative, OverlayCue } from '@matchiq/contracts';
import { reduceInsight, reduceNarrative } from './reduce-insights';
import { reduceHydratedCue } from './reduce-overlays';
import type { MatchData } from './types';

export type Hydration = {
  insights?: readonly Insight[];
  narratives?: readonly Narrative[];
  overlays?: readonly OverlayCue[];
};

type Step<T> = (state: MatchData, item: T) => Partial<MatchData>;

const fold = <T>(
  state: MatchData,
  items: readonly T[] | undefined,
  step: Step<T>,
): MatchData =>
  (items ?? []).reduce<MatchData>(
    (acc, item) => ({ ...acc, ...step(acc, item) }),
    state,
  );

/** The stream is fresher than a read model, so a known insight is kept. */
const hydrateInsight: Step<Insight> = (state, insight) =>
  state.insights.some((i) => i.insightId === insight.insightId)
    ? {}
    : reduceInsight(state, insight);

/**
 * Merges REST read models into stream state. Every step is idempotent and
 * deduped (insights by id, narratives by `createdAt`, cues by revision), so
 * the order of hydration and stream delivery does not matter.
 */
export const reduceHydration = (
  state: MatchData,
  hydration: Hydration,
): MatchData => {
  const withInsights = fold(state, hydration.insights, hydrateInsight);
  const withNarratives = fold(
    withInsights,
    hydration.narratives,
    reduceNarrative,
  );
  return fold(withNarratives, hydration.overlays, reduceHydratedCue);
};
