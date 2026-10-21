import { REASON_CODES } from '../constants.js';
import { matchRef } from '../metrics/registry.js';
import { opponentOf, sideOf } from '../projection/initial-state.js';
import { SIDES } from '../types.js';
import { COUNTER, RATIONALE } from './copy.js';
import { opponentCounter, sampleSize, teamName } from './rule-helpers.js';
import type { Candidate, Rule, RuleInput } from './types.js';

const goalTotals = (input: RuleInput): Record<string, number> =>
  Object.fromEntries(
    SIDES.map((side) => [
      matchRef('goals', side),
      input.derived.tallies[side].goals,
    ]),
  );

/** GOAL is always P0. The linked shot is cited only when it has been applied. */
export const goalRule: Rule = (input) => {
  const { event } = input;
  if (event.type !== 'GOAL') return [];
  const scorerSide = sideOf(input.context, event.teamId);
  if (scorerSide === null) return [];
  const side = event.ownGoal ? opponentOf(scorerSide) : scorerSide;
  const shotKnown = SIDES.some((s) =>
    input.derived.timelines[s].shots.some(
      (e) => e.eventId === event.shotEventId,
    ),
  );
  const { home, away } = input.derived.tallies;
  const describe = event.ownGoal ? RATIONALE.ownGoal : RATIONALE.goal;
  const candidate: Candidate = {
    kind: 'GOAL',
    priority: 'P0',
    side,
    ...(event.ownGoal ? {} : { playerId: event.playerId }),
    reasonCode: event.ownGoal ? REASON_CODES.ownGoal : REASON_CODES.goal,
    evidence: 'observed',
    eventIds: shotKnown ? [event.eventId, event.shotEventId] : [event.eventId],
    computedMetrics: { ...input.metrics, ...goalTotals(input) },
    sampleSize: sampleSize(input),
    rationale: describe(teamName(input, side), home.goals, away.goals),
    counterEvidence: opponentCounter(
      input,
      side,
      'shots',
      COUNTER.opponentShots,
    ),
    debounced: false,
  };
  return [candidate];
};

/** A straight RED or a SECOND_YELLOW is a dismissal and always P0. */
export const redCardRule: Rule = (input) => {
  const { event } = input;
  if (event.type !== 'CARD' || event.card === 'YELLOW') return [];
  const side = sideOf(input.context, event.teamId);
  if (side === null) return [];
  const dismissals = input.derived.tallies[side].redCards;
  const secondYellow = event.card === 'SECOND_YELLOW';
  const describe = secondYellow ? RATIONALE.secondYellow : RATIONALE.redCard;
  return [
    {
      kind: 'RED_CARD',
      priority: 'P0',
      side,
      playerId: event.playerId,
      reasonCode: secondYellow
        ? REASON_CODES.secondYellow
        : REASON_CODES.redCard,
      evidence: 'observed',
      eventIds: [event.eventId],
      computedMetrics: {
        ...input.metrics,
        [matchRef('redCards', side)]: dismissals,
        [matchRef('yellowCards', side)]:
          input.derived.tallies[side].yellowCards,
      },
      sampleSize: sampleSize(input),
      rationale: describe(teamName(input, side), dismissals),
      counterEvidence: [],
      debounced: false,
    },
  ];
};
