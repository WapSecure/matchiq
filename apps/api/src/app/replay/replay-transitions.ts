import type {
  ReplayCommand,
  ReplayState,
  ReplayStatus,
} from '@matchiq/contracts';
import { REPLAY_CONFLICTS } from '../constants';

/** States from which each command is accepted; mirrors `ReplayController`. */
const ALLOWED: Readonly<
  Record<ReplayCommand['action'], readonly ReplayState[]>
> = {
  start: ['IDLE'],
  pause: ['PLAYING'],
  resume: ['PAUSED'],
  setSpeed: ['IDLE', 'PLAYING', 'PAUSED'],
  seek: ['PLAYING', 'PAUSED'],
};

const TARGET: Readonly<
  Record<ReplayCommand['action'], (state: ReplayState) => ReplayState>
> = {
  start: () => 'PLAYING',
  pause: () => 'PAUSED',
  resume: () => 'PLAYING',
  setSpeed: (state) => state,
  seek: (state) => state,
};

export type TransitionCheck =
  | { readonly ok: true; readonly target: ReplayStatus }
  | { readonly ok: false; readonly reason: string };

const seekProblem = (
  command: Extract<ReplayCommand, { action: 'seek' }>,
  status: ReplayStatus,
  lastSequence: number,
): string | null => {
  if (command.sequence > lastSequence) {
    return REPLAY_CONFLICTS.seekOutOfRange(command.sequence, lastSequence);
  }
  if (command.sequence <= status.appliedSequence) {
    return REPLAY_CONFLICTS.seekBackwards(
      command.sequence,
      status.appliedSequence,
    );
  }
  return null;
};

/**
 * Validates a command against the session's persisted status before it is
 * queued for the worker, and predicts the status it leads to. Seeks only move
 * forward: the ledger is append-only, so rewinding is a client-side scrub
 * over events already received (ADR-0013).
 */
export const checkTransition = (
  status: ReplayStatus,
  command: ReplayCommand,
  lastSequence: number,
): TransitionCheck => {
  if (!ALLOWED[command.action].includes(status.state)) {
    return {
      ok: false,
      reason: REPLAY_CONFLICTS.transition(command.action, status.state),
    };
  }
  if (command.action === 'seek') {
    const problem = seekProblem(command, status, lastSequence);
    if (problem !== null) return { ok: false, reason: problem };
  }
  const speed =
    command.action === 'start' || command.action === 'setSpeed'
      ? command.speed
      : status.speed;
  return {
    ok: true,
    target: { ...status, state: TARGET[command.action](status.state), speed },
  };
};
