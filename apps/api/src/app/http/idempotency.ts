import {
  type IdempotencyRequest,
  type LedgerTransaction,
  sha256Hex,
  type StoredResponse,
} from '@matchiq/db';
import { HEADER_ERRORS, HEADERS, PATTERNS } from '../constants';
import { problem } from './problems';

export interface IdempotentResult<T> {
  readonly status: number;
  readonly body: T;
  readonly replayed: boolean;
}

/** Validates an optional `Idempotency-Key` header value. */
export const parseIdempotencyKey = (
  raw: string | undefined,
): string | undefined => {
  if (raw === undefined) return undefined;
  if (!PATTERNS.idempotencyKey.test(raw)) {
    throw problem('invalidHeader', {
      errors: [
        { path: HEADERS.idempotencyKey, message: HEADER_ERRORS.invalidFormat },
      ],
    });
  }
  return raw;
};

export interface IdempotencyScope<T> {
  readonly orgId: string;
  readonly scope: string;
  readonly key: string | undefined;
  readonly request: unknown;
  /** Re-validates a stored response against its contract before replaying it. */
  readonly parse: (body: unknown) => T;
}

/**
 * Runs `work` inside `tx` once per key. Only successful responses are stored:
 * an error rolls the claim back with everything else, so a retry re-executes.
 */
export const withIdempotency = async <T>(
  tx: LedgerTransaction,
  scope: IdempotencyScope<T>,
  work: () => Promise<StoredResponse & { body: T }>,
): Promise<IdempotentResult<T>> => {
  if (scope.key === undefined) return { ...(await work()), replayed: false };
  const request: IdempotencyRequest = {
    orgId: scope.orgId,
    scope: scope.scope,
    key: scope.key,
    requestHash: sha256Hex(scope.request),
  };
  const claim = await tx.claimIdempotencyKey(request);
  if (claim.kind === 'mismatch') throw problem('idempotencyMismatch');
  if (claim.kind === 'replay') {
    return {
      status: claim.response.status,
      body: scope.parse(claim.response.body),
      replayed: true,
    };
  }
  const response = await work();
  await tx.completeIdempotencyKey(request, response);
  return { ...response, replayed: false };
};
