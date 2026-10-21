import type { Fixture, MatchEvent } from '@matchiq/contracts';
import { ERRORS, FIRST_SEQUENCE, NO_SEQUENCE } from '../constants.js';
import type { ProjectionState } from '../types.js';
import { foldEvent, foldLedger, isCountable } from './fold.js';
import { createInitialState } from './initial-state.js';

export const lastSequence = (state: ProjectionState): number =>
  state.ledger.at(-1)?.sequence ?? NO_SEQUENCE;

const insertBySequence = (
  ledger: readonly MatchEvent[],
  event: MatchEvent,
): MatchEvent[] => {
  const index = ledger.findIndex((e) => e.sequence > event.sequence);
  if (index === -1) return [...ledger, event];
  return [...ledger.slice(0, index), event, ...ledger.slice(index)];
};

const isDuplicate = (state: ProjectionState, event: MatchEvent): boolean =>
  state.sequences.has(event.sequence) ||
  state.ledger.some((e) => e.eventId === event.eventId);

/**
 * Pure, idempotent application of one event.
 *
 * - An event whose `sequence` or `eventId` is already in the ledger is a no-op
 *   (first write wins; the ingest boundary rejects changed bodies with 409).
 * - An in-order event (sequence above every applied one) is folded incrementally.
 * - A late (out-of-order) event or a CORRECTION re-folds the whole ledger in
 *   sequence order, so the result equals in-order projection of the same set.
 *   While a sequence gap exists the snapshot is `provisional`.
 */
export const applyEvent = (
  state: ProjectionState,
  event: MatchEvent,
): ProjectionState => {
  if (event.fixtureId !== state.fixture.fixtureId) {
    throw new Error(
      ERRORS.wrongFixture(state.fixture.fixtureId, event.fixtureId),
    );
  }
  if (isDuplicate(state, event)) return state;

  const inOrder = event.sequence > lastSequence(state);
  const ledger = insertBySequence(state.ledger, event);
  const sequences = new Set(state.sequences).add(event.sequence);

  if (event.type === 'CORRECTION') {
    const voided = new Set(state.voided).add(event.correctedEventId);
    const derived = foldLedger(ledger, voided, state.fixture);
    return { ...state, ledger, sequences, voided, derived };
  }
  if (!inOrder) {
    const derived = foldLedger(ledger, state.voided, state.fixture);
    return { ...state, ledger, sequences, derived };
  }
  const derived = state.voided.has(event.eventId)
    ? state.derived
    : foldEvent(state.derived, event, state.fixture);
  return { ...state, ledger, sequences, derived };
};

export const project = (
  fixture: Fixture,
  events: readonly MatchEvent[],
): ProjectionState => events.reduce(applyEvent, createInitialState(fixture));

/** True when a sequence between FIRST_SEQUENCE and the last applied one is missing. */
export const hasSequenceGap = (state: ProjectionState): boolean =>
  state.sequences.size !== lastSequence(state) - FIRST_SEQUENCE + 1;

/** CORRECTIONs whose target event has not been applied yet. */
export const hasPendingCorrection = (state: ProjectionState): boolean => {
  const known = new Set(state.ledger.map((e) => e.eventId));
  return [...state.voided].some((eventId) => !known.has(eventId));
};

/** Events that currently contribute to the projection, in sequence order. */
export const countableEvents = (state: ProjectionState): MatchEvent[] =>
  state.ledger.filter((e) => isCountable(e, state.voided));
