import type { MatchEvent } from '@matchiq/contracts';
import { sha256Hex } from '../hash.js';
import type { PipelineTransaction } from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';

export const LEDGER_ERRORS = {
  gap: (expected: number, actual: number) =>
    `ledger expects sequence ${expected} next, got ${actual}`,
} as const;

/**
 * Appends the events the ledger does not hold yet, inside the caller's
 * transaction so they commit with their `match.event` stream messages.
 * Events at or below the stored head are skipped, which makes a retried batch
 * a no-op; a gap after the head is a programming error and aborts the batch.
 */
export const appendReplayedEvents = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  ingestionId: string,
  events: readonly MatchEvent[],
): Promise<MatchEvent[]> => {
  const head = await tx.ledgerHead(key);
  const fresh = events.filter((e) => e.sequence > head);
  fresh.forEach((event, i) => {
    const expected = head + 1 + i;
    if (event.sequence !== expected) {
      throw new Error(LEDGER_ERRORS.gap(expected, event.sequence));
    }
  });
  await tx.insertEvents(
    key,
    ingestionId,
    fresh.map((event) => ({ event, payloadHash: sha256Hex(event) })),
  );
  return fresh;
};
