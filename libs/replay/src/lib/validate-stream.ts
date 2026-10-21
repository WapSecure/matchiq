import { REPLAY_ERROR_MESSAGES as M } from './constants.js';
import type { ReplayControllerOptions, ReplayError } from './types.js';

export const validateStream = (
  options: Pick<ReplayControllerOptions, 'events' | 'fixtureId'>,
): ReplayError | null => {
  if (options.events.length === 0) {
    return { code: 'INVALID_EVENTS', message: M.emptyStream };
  }
  for (const [index, event] of options.events.entries()) {
    if (event.sequence !== index) {
      return {
        code: 'INVALID_EVENTS',
        message: M.sequenceGap(index, event.sequence),
      };
    }
    if (event.fixtureId !== options.fixtureId) {
      return { code: 'INVALID_EVENTS', message: M.fixtureMismatch(index) };
    }
  }
  return null;
};
