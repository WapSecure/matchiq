import type { HashedEvent, StoredEventRef } from '@matchiq/db';
import type { FieldError } from '@matchiq/server-kit';
import { CONFLICT_REASONS } from '../constants';

export interface BatchClassification {
  /** New events in ascending sequence order. */
  readonly fresh: HashedEvent[];
  readonly duplicates: number;
  readonly conflicts: FieldError[];
}

type Verdict = 'fresh' | 'duplicate' | keyof typeof CONFLICT_REASONS;

interface Index {
  readonly byEventId: Map<string, StoredEventRef>;
  readonly bySequence: Map<number, string>;
}

const indexOf = (refs: readonly StoredEventRef[]): Index => ({
  byEventId: new Map(refs.map((r) => [r.eventId, r])),
  bySequence: new Map(refs.map((r) => [r.sequence, r.eventId])),
});

const judge = (
  { event, payloadHash }: HashedEvent,
  index: Index,
  conflictReason: keyof typeof CONFLICT_REASONS,
): Verdict | undefined => {
  const sameId = index.byEventId.get(event.eventId);
  if (sameId) {
    // The hash covers sequence, so equal hashes imply the same slot.
    return sameId.payloadHash === payloadHash ? 'duplicate' : conflictReason;
  }
  const holder = index.bySequence.get(event.sequence);
  if (holder !== undefined && holder !== event.eventId) {
    return conflictReason === 'changedBody' ? 'sequenceTaken' : conflictReason;
  }
  return undefined;
};

/**
 * Splits a batch into new events, exact re-submissions (same eventId and body)
 * and conflicts: a reused eventId with a different body, a sequence held by a
 * different event, or an inconsistent repeat inside the batch itself.
 */
export const classifyBatch = (
  incoming: readonly HashedEvent[],
  stored: readonly StoredEventRef[],
): BatchClassification => {
  const ledger = indexOf(stored);
  const batch = indexOf([]);
  const fresh: HashedEvent[] = [];
  const conflicts: FieldError[] = [];
  let duplicates = 0;

  incoming.forEach((item, i) => {
    const verdict =
      judge(item, ledger, 'changedBody') ??
      judge(item, batch, 'duplicateInBatch') ??
      'fresh';
    if (verdict === 'duplicate') duplicates += 1;
    else if (verdict === 'fresh') {
      fresh.push(item);
      batch.byEventId.set(item.event.eventId, {
        eventId: item.event.eventId,
        sequence: item.event.sequence,
        payloadHash: item.payloadHash,
      });
      batch.bySequence.set(item.event.sequence, item.event.eventId);
    } else {
      conflicts.push({
        path: `$.events.${i}`,
        message: `${item.event.eventId}@${item.event.sequence}: ${CONFLICT_REASONS[verdict]}`,
      });
    }
  });

  fresh.sort((a, b) => a.event.sequence - b.event.sequence);
  return { fresh, duplicates, conflicts };
};
