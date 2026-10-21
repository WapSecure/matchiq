import type {
  FixtureId,
  MatchEvent,
  ReplayCommand,
  ReplayState,
  ReplayStatus,
} from '@matchiq/contracts';
import type { REPLAY_TIMING } from './constants.js';
import type { Scheduler } from './scheduler.js';

/**
 * `reset` follows a seek: consumers discard derived state, rebuild it from
 * events with sequence <= `appliedSequence` (ledger or snapshot), then keep
 * consuming events from `nextSequence`.
 */
export type ReplaySignal =
  | { readonly kind: 'event'; readonly event: MatchEvent }
  | {
      readonly kind: 'reset';
      readonly appliedSequence: number;
      readonly nextSequence: number;
    }
  | { readonly kind: 'completed' };

export type ReplayErrorCode =
  | 'INVALID_TRANSITION'
  | 'SEEK_OUT_OF_RANGE'
  | 'INVALID_COMMAND'
  | 'INVALID_EVENTS';

export interface ReplayError {
  readonly code: ReplayErrorCode;
  readonly message: string;
  readonly state?: ReplayState;
  readonly action?: ReplayCommand['action'];
}

export type ReplayResult =
  | { readonly ok: true; readonly status: ReplayStatus }
  | { readonly ok: false; readonly error: ReplayError };

export type ReplayTiming = {
  -readonly [K in keyof typeof REPLAY_TIMING]: number;
};

export interface ReplayControllerOptions {
  readonly fixtureId: FixtureId;
  /** Must be one fixture's full stream with contiguous sequences from 0. */
  readonly events: readonly MatchEvent[];
  readonly scheduler: Scheduler;
  readonly onSignal: (signal: ReplaySignal) => void;
  readonly timing?: Partial<ReplayTiming>;
}
