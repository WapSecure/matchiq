import {
  PLAYER_COUNT_KINDS,
  playerCountKey,
  REASON_CODES,
  type PlayerCountKind,
} from '../constants.js';
import { matchRef } from '../metrics/registry.js';
import { sideOf } from '../projection/initial-state.js';
import { MILESTONE_LIMITATION, RATIONALE } from './copy.js';
import { teamName } from './rule-helpers.js';
import type { Candidate, Rule, RuleInput } from './types.js';

interface Milestone {
  readonly countKind: PlayerCountKind;
  readonly reasonCode: string;
  readonly metric: 'shotsOnTarget' | 'goals' | 'yellowCards';
  readonly describe: (team: string) => string;
}

const MILESTONES = {
  shotOnTarget: {
    countKind: PLAYER_COUNT_KINDS.shotOnTarget,
    reasonCode: REASON_CODES.firstShotOnTarget,
    metric: 'shotsOnTarget',
    describe: RATIONALE.firstShotOnTarget,
  },
  goal: {
    countKind: PLAYER_COUNT_KINDS.goal,
    reasonCode: REASON_CODES.firstGoal,
    metric: 'goals',
    describe: RATIONALE.firstGoal,
  },
  yellowCard: {
    countKind: PLAYER_COUNT_KINDS.yellowCard,
    reasonCode: REASON_CODES.firstYellowCard,
    metric: 'yellowCards',
    describe: RATIONALE.firstYellowCard,
  },
} as const satisfies Record<string, Milestone>;

/** Fires on the event that takes a player's count to exactly 1, so re-scans emit the same id. */
const firstOf = (
  input: RuleInput,
  playerId: string,
  teamId: string,
  milestone: Milestone,
): readonly Candidate[] => {
  const side = sideOf(input.context, teamId);
  const count = input.derived.playerCounts.get(
    playerCountKey(milestone.countKind, playerId),
  );
  if (side === null || count !== 1) return [];
  return [
    {
      kind: 'PLAYER_MILESTONE',
      priority: 'P2',
      side,
      playerId,
      reasonCode: milestone.reasonCode,
      evidence: 'observed',
      eventIds: [input.event.eventId],
      computedMetrics: {
        [matchRef(milestone.metric, side)]:
          input.derived.tallies[side][milestone.metric],
      },
      sampleSize: 1,
      envelope: {
        sampleSize: 1,
        limitations: MILESTONE_LIMITATION,
        confidenceType: 'measured',
      },
      rationale: milestone.describe(teamName(input, side)),
      counterEvidence: [],
      debounced: false,
    },
  ];
};

const shotOnTargetRule: Rule = (input) => {
  const { event } = input;
  if (event.type !== 'SHOT' || event.outcome !== 'ON_TARGET') return [];
  return firstOf(input, event.playerId, event.teamId, MILESTONES.shotOnTarget);
};

const goalMilestoneRule: Rule = (input) => {
  const { event } = input;
  if (event.type !== 'GOAL' || event.ownGoal) return [];
  return firstOf(input, event.playerId, event.teamId, MILESTONES.goal);
};

const yellowCardMilestoneRule: Rule = (input) => {
  const { event } = input;
  if (event.type !== 'CARD' || event.card !== 'YELLOW') return [];
  return firstOf(input, event.playerId, event.teamId, MILESTONES.yellowCard);
};

export const milestoneRules: readonly Rule[] = [
  shotOnTargetRule,
  goalMilestoneRule,
  yellowCardMilestoneRule,
];
