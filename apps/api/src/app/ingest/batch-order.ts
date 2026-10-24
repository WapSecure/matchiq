import type { MatchEvent } from '@matchiq/contracts';
import type { StoredEventTail } from '@matchiq/db';
import type { FieldError } from '@matchiq/server-kit';
import {
  type FixtureIssue,
  checkBatchOrder,
  findSequenceGaps,
} from '@matchiq/synthetic-data';
import { ORDER_WARNINGS } from './ingest.constants';

export interface BatchOrder {
  readonly violations: FieldError[];
  readonly warnings: string[];
}

const describe = (issue: FixtureIssue): string =>
  `${issue.eventId ?? 'event'}: ${issue.message}`;

/** Semantic checks for new events only; stored duplicates were judged when first accepted. */
export const assessBatchOrder = (
  events: readonly MatchEvent[],
  tail: StoredEventTail | null,
): BatchOrder => {
  const indexOf = new Map(events.map((e, i) => [e.eventId, i]));
  const violations = checkBatchOrder(events, tail).map((issue) => ({
    path: `$.events.${indexOf.get(issue.eventId ?? '') ?? 0}`,
    message: describe(issue),
  }));
  const gaps = findSequenceGaps(events, tail).map(describe);
  return {
    violations,
    warnings: gaps.length > 0 ? [...gaps, ORDER_WARNINGS.gapsProvisional] : [],
  };
};
