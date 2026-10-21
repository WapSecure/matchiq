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

const TERMINAL = new Set<Insight['status']>([
  'PUBLISHED',
  'FALLBACK',
  'REJECTED',
  'EXPIRED',
]);

/**
 * A known insight keeps its streamed version unless the read model has moved
 * it to a terminal status the stream did not announce (`insight.detected`
 * carries the detection-time status only).
 */
const hydrateInsight: Step<Insight> = (state, insight) => {
  const known = state.insights.find((i) => i.insightId === insight.insightId);
  if (!known) return reduceInsight(state, insight);
  return TERMINAL.has(insight.status) && !TERMINAL.has(known.status)
    ? reduceInsight(state, insight)
    : {};
};

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
