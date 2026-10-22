import { Inject, Injectable } from '@nestjs/common';
import type { UnitOfWork } from '@matchiq/db';
import { UNIT_OF_WORK } from '../infrastructure/tokens';
import {
  type IdempotencyScope,
  type IdempotentResult,
  withIdempotency,
} from './idempotency';

/**
 * `Idempotency-Key` for writes whose work happens outside a ledger
 * transaction (queue sends, other stores). The key is claimed in its own
 * transaction, which blocks a concurrent duplicate, and is stored only if
 * `work` succeeds; a failure releases it so the client can retry.
 */
@Injectable()
export class IdempotencyService {
  constructor(@Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork) {}

  async run<T>(
    scope: IdempotencyScope<T>,
    work: () => Promise<{ status: number; body: T }>,
  ): Promise<IdempotentResult<T>> {
    if (scope.key === undefined) return { ...(await work()), replayed: false };
    return this.uow.transaction((tx) => withIdempotency(tx, scope, work));
  }
}
