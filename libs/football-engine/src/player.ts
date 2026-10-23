/**
 * Browser-safe entry: the root entry also exports hashing, which needs
 * `node:crypto`, so the web app imports player projections from here.
 */
export {
  momentsInvolvingPlayer,
  playerInvolvement,
} from './lib/player/involvement.js';
export type {
  PlayerAction,
  PlayerActionKind,
  PlayerInvolvement,
  PlayerMilestone,
  PlayerMilestoneKind,
  PlayerTally,
} from './lib/player/types.js';
