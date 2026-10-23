import {
  CONTEXT_REFS,
  type ContextSide,
  type Insight,
  type MomentContext,
} from '@matchiq/contracts';
import type { DerivedState, FixtureContext } from '../types.js';
import { matchMinute, minutePhase, type ClockPoint } from './clock.js';
import {
  CONTEXT_METHOD_VERSION,
  CONTEXT_WINDOWS,
  KEY_METRIC,
} from './constants.js';
import {
  precedingRegain,
  previousMoment,
  scoreFact,
  trendFact,
  windowFact,
} from './facts.js';

export interface MomentContextInput {
  /** The projection's derived state right after the moment's anchor event. */
  readonly derived: DerivedState;
  readonly fixture: FixtureContext;
  readonly insight: Insight;
  /** Moments detected earlier in this match, in detection order. */
  readonly prior: readonly Insight[];
}

const SIDES: readonly ContextSide[] = ['home', 'away'];

const pointOf = (insight: Insight): ClockPoint => ({
  period: insight.period,
  clockMs: insight.matchClockMs,
});

const sideOf = (fixture: FixtureContext, teamId?: string): ContextSide =>
  teamId === fixture.teamIds.away ? 'away' : 'home';

const comparisonOf = (
  input: MomentContextInput,
  metrics: Record<string, number>,
) => {
  const metric = KEY_METRIC[input.insight.kind];
  const facts = SIDES.map((side) =>
    windowFact(input.derived.timelines[side][metric], pointOf(input.insight)),
  );
  if (facts.some((f) => f === null)) return null;
  SIDES.forEach((side, i) => {
    metrics[CONTEXT_REFS.recent(side)] = facts[i]?.recent ?? 0;
    metrics[CONTEXT_REFS.average(side)] = facts[i]?.average ?? 0;
  });
  metrics[CONTEXT_REFS.windowMinutes] = CONTEXT_WINDOWS.compareMinutes;
  return { metric };
};

const trendOf = (
  input: MomentContextInput,
  side: ContextSide,
  metrics: Record<string, number>,
) => {
  const metric = KEY_METRIC[input.insight.kind];
  const trend = trendFact(
    input.derived.timelines[side][metric],
    pointOf(input.insight),
  );
  if (trend === null) return null;
  trend.spells.forEach((count, i) => {
    const ref = CONTEXT_REFS.spells[i];
    if (ref !== undefined) metrics[ref] = count;
  });
  return { metric, direction: trend.direction };
};

const linkedOf = (
  input: MomentContextInput,
  side: ContextSide,
  metrics: Record<string, number>,
) => {
  const { insight } = input;
  const regain =
    insight.kind === 'GOAL'
      ? precedingRegain(
          input.derived.timelines[side].recoveries,
          pointOf(insight),
        )
      : null;
  const previous = previousMoment(input.prior, insight);
  if (regain !== null)
    metrics[CONTEXT_REFS.regainSeconds] = regain.secondsBefore;
  if (previous !== null) metrics[CONTEXT_REFS.previousMinute] = previous.minute;
  return {
    linked: {
      ...(regain === null ? {} : { regainEventId: regain.eventId }),
      ...(previous === null ? {} : { previousInsightId: previous.insightId }),
    },
    eventIds: regain === null ? [] : [regain.eventId],
  };
};

/**
 * Score, time, recent-versus-average, trend and linked events for one key
 * moment, from engine state only. Pure: equal inputs give an equal context.
 */
export const momentContext = (input: MomentContextInput): MomentContext => {
  const side = sideOf(input.fixture, input.insight.teamId);
  const goals = {
    home: input.derived.tallies.home.goals,
    away: input.derived.tallies.away.goals,
  };
  const score = scoreFact(goals, side);
  const metrics: Record<string, number> = {
    [CONTEXT_REFS.scoreHome]: goals.home,
    [CONTEXT_REFS.scoreAway]: goals.away,
    [CONTEXT_REFS.margin]: score.margin,
    [CONTEXT_REFS.minute]: matchMinute(pointOf(input.insight)),
  };
  const comparison = comparisonOf(input, metrics);
  const trend = trendOf(input, side, metrics);
  const { linked, eventIds } = linkedOf(input, side, metrics);
  return {
    methodVersion: CONTEXT_METHOD_VERSION,
    side,
    scoreState: score.state,
    phase: minutePhase(pointOf(input.insight)),
    comparison,
    trend,
    linked,
    eventIds,
    metrics,
  };
};
