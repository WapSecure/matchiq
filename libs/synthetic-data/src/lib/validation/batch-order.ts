import type { MatchEvent } from '@matchiq/contracts';
import { type FixtureIssue, ISSUE_MESSAGES as M } from './issues.js';

/** The last event already stored for a fixture, enough to continue a stream. */
export interface LedgerTail {
  readonly sequence: number;
  readonly type: MatchEvent['type'];
  readonly period: number;
  readonly matchClockMs: number;
}

type Anchor = Pick<MatchEvent, 'sequence' | 'type' | 'period' | 'matchClockMs'>;

const issue = (
  code: FixtureIssue['code'],
  event: MatchEvent,
  message: string,
): FixtureIssue => ({
  code,
  message,
  sequence: event.sequence,
  eventId: event.eventId,
});

const bySequence = (events: readonly MatchEvent[]): MatchEvent[] =>
  [...events].sort((a, b) => a.sequence - b.sequence);

const pairIssues = (previous: Anchor, event: MatchEvent): FixtureIssue[] => {
  const found: FixtureIssue[] = [];
  if (previous.type === 'MATCH_ENDED') {
    found.push(issue('EVENT_AFTER_MATCH_END', event, M.afterEnd));
  }
  if (
    previous.period === event.period &&
    event.matchClockMs < previous.matchClockMs
  ) {
    const message = M.clock(event.matchClockMs, previous.matchClockMs);
    found.push(issue('CLOCK_REGRESSION', event, message));
  }
  if (event.period < previous.period) {
    const message = M.periodRegress(event.period, previous.period);
    found.push(issue('PERIOD_STRUCTURE', event, message));
  }
  // A period only opens with PERIOD_STARTED, one at a time; this needs adjacent events.
  const adjacent = event.sequence === previous.sequence + 1;
  const opensCleanly =
    event.period === previous.period + 1 && event.type === 'PERIOD_STARTED';
  if (adjacent && event.period > previous.period && !opensCleanly) {
    const message = M.periodSkip(event.period, previous.period);
    found.push(issue('PERIOD_STRUCTURE', event, message));
  }
  return found;
};

/**
 * Clock regressions and impossible period transitions in a streamed batch, in
 * sequence order, continuing from the stored tail. Events at or below the tail
 * (late backfill) are not compared with it.
 */
export const checkBatchOrder = (
  events: readonly MatchEvent[],
  tail: LedgerTail | null,
): FixtureIssue[] => {
  const found: FixtureIssue[] = [];
  let previous: Anchor | null = tail;
  for (const event of bySequence(events)) {
    if (previous !== null && event.sequence <= previous.sequence) continue;
    if (previous !== null) found.push(...pairIssues(previous, event));
    previous = event;
  }
  return found;
};

/** Sequences missing between the stored tail and the batch, as plain issues. */
export const findSequenceGaps = (
  events: readonly MatchEvent[],
  tail: LedgerTail | null,
): FixtureIssue[] => {
  let expected = (tail?.sequence ?? -1) + 1;
  const found: FixtureIssue[] = [];
  for (const event of bySequence(events)) {
    if (event.sequence < expected) continue;
    if (event.sequence > expected) {
      const message = M.sequence(event.sequence, expected);
      found.push(issue('SEQUENCE_GAP', event, message));
    }
    expected = event.sequence + 1;
  }
  return found;
};
