import type { DerivedState, ProjectionState } from '../types.js';
import { foldEvent } from '../projection/fold.js';
import { INITIAL_DERIVED } from '../projection/initial-state.js';
import { countableEvents } from '../projection/projector.js';
import type { ClockPoint } from './clock.js';

/**
 * The derived state as it stood at `at` (events up to and including that
 * match clock). Used for moment context so a moment found by a re-scan gets
 * exactly the context it would have had when detected live.
 */
export const derivedAt = (
  state: ProjectionState,
  at: ClockPoint,
): DerivedState =>
  countableEvents(state)
    .filter(
      (e) =>
        e.period < at.period ||
        (e.period === at.period && e.matchClockMs <= at.clockMs),
    )
    .reduce(
      (derived, event) => foldEvent(derived, event, state.fixture),
      INITIAL_DERIVED,
    );
