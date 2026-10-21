import { and, eq } from 'drizzle-orm';
import type { Transaction } from '../client.js';
import type { IdempotencyClaim, IdempotencyRequest } from '../ports.js';
import { idempotencyKeys } from '../schema/tables.js';

/**
 * Inserts the key first: a concurrent request with the same key blocks on the
 * primary key until this transaction ends, then sees the committed response.
 * A rolled-back attempt leaves no row, so failed requests can be retried.
 */
export const claimIdempotencyKey = async (
  tx: Transaction,
  request: IdempotencyRequest,
): Promise<IdempotencyClaim> => {
  const inserted = await tx
    .insert(idempotencyKeys)
    .values(request)
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });
  if (inserted.length > 0) return { kind: 'claimed' };

  const [existing] = await tx
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.orgId, request.orgId),
        eq(idempotencyKeys.scope, request.scope),
        eq(idempotencyKeys.key, request.key),
      ),
    );
  if (
    !existing ||
    existing.requestHash !== request.requestHash ||
    existing.responseStatus === null
  ) {
    return { kind: 'mismatch' };
  }
  return {
    kind: 'replay',
    response: { status: existing.responseStatus, body: existing.responseBody },
  };
};
