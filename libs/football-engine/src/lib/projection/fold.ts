import type { MatchEvent } from '@matchiq/contracts';
import type { DerivedState, FixtureContext } from '../types.js';
import type { Handler } from './derived-ops.js';
import { HANDLERS } from './handlers.js';
import { INITIAL_DERIVED } from './initial-state.js';

/**
 * Folds one event that is neither a CORRECTION nor voided. The displayed
 * clock never runs backwards within a period.
 */
export const foldEvent = (
  derived: DerivedState,
  event: MatchEvent,
  context: FixtureContext,
): DerivedState => {
  const newPeriod = derived.period !== event.period;
  const clocked: DerivedState = {
    ...derived,
    period: event.period,
    clockMs: newPeriod
      ? event.matchClockMs
      : Math.max(derived.clockMs, event.matchClockMs),
    periodStartClockMs: newPeriod
      ? event.matchClockMs
      : derived.periodStartClockMs,
  };
  const handler = HANDLERS[event.type] as Handler | undefined;
  return handler === undefined ? clocked : handler(clocked, event, context);
};

export const isCountable = (
  event: MatchEvent,
  voided: ReadonlySet<string>,
): boolean => event.type !== 'CORRECTION' && !voided.has(event.eventId);

/** Rebuilds every aggregate from the ledger; the reference semantics for corrections. */
export const foldLedger = (
  ledger: readonly MatchEvent[],
  voided: ReadonlySet<string>,
  context: FixtureContext,
): DerivedState =>
  ledger.reduce(
    (derived, event) =>
      isCountable(event, voided) ? foldEvent(derived, event, context) : derived,
    INITIAL_DERIVED,
  );
