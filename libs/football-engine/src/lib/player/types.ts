import type { PitchPoint } from '@matchiq/contracts';

/** What a player did, as counted from the ledger. Tracking data is never used. */
export type PlayerActionKind =
  'pass' | 'shot' | 'pressure' | 'recovery' | 'goal' | 'card';

export type PlayerMilestoneKind =
  'FIRST_SHOT_ON_TARGET' | 'GOAL' | 'BOOKED' | 'SENT_OFF';

export interface PlayerAction {
  readonly eventId: string;
  readonly sequence: number;
  readonly period: number;
  readonly clockMs: number;
  readonly kind: PlayerActionKind;
  /** Where the event was recorded; null for goals and cards. */
  readonly location: PitchPoint | null;
}

export interface PlayerMilestone {
  readonly kind: PlayerMilestoneKind;
  readonly eventId: string;
  readonly period: number;
  readonly clockMs: number;
}

export interface PlayerTally {
  readonly passesAttempted: number;
  readonly passesCompleted: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly pressures: number;
  readonly recoveries: number;
  readonly goals: number;
  readonly yellowCards: number;
  readonly redCards: number;
}

export interface PlayerInvolvement {
  readonly playerId: string;
  readonly tally: PlayerTally;
  /** In ledger (sequence) order. */
  readonly actions: readonly PlayerAction[];
  readonly milestones: readonly PlayerMilestone[];
}
