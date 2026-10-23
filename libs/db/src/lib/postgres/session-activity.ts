import type { ReplayState } from '@matchiq/contracts';
import { and, count, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import type { Executor, Transaction } from '../client.js';
import { RETENTION } from '../constants.js';
import {
  SessionCapacityExceeded,
  type ActiveSessionQuery,
  type SessionCapacity,
} from '../operations-types.js';
import type { FixtureKey } from '../ports.js';
import { replaySessions as s } from '../schema/intelligence-tables.js';

const MS_PER_SECOND = 1_000;
const SLOT_STATES: readonly ReplayState[] = ['PLAYING', 'IDLE'];

export const countActiveSessions = async (
  db: Executor,
  query: ActiveSessionQuery,
): Promise<number> => {
  const [row] = await db
    .select({ n: count() })
    .from(s)
    .where(
      and(
        eq(s.orgId, query.orgId),
        inArray(s.state, [...SLOT_STATES]),
        gt(
          s.updatedAt,
          sql`now() - make_interval(secs => ${query.idleMs / MS_PER_SECOND})`,
        ),
        query.excludeFixtureId === undefined
          ? undefined
          : ne(s.fixtureId, query.excludeFixtureId),
      ),
    );
  return row?.n ?? 0;
};

/** Runs as the owner role across organisations (system scope, ADR-0018). */
export const listSessionsInState = (
  db: Executor,
  input: { state: ReplayState; limit: number },
): Promise<FixtureKey[]> =>
  db
    .select({ orgId: s.orgId, fixtureId: s.fixtureId })
    .from(s)
    .where(eq(s.state, input.state))
    .orderBy(desc(s.updatedAt))
    .limit(input.limit);

/**
 * Serialises session creation per org on an advisory lock, so concurrent
 * creates cannot both take the last slot.
 */
export const reserveSlot = async (
  tx: Transaction,
  orgId: string,
  capacity: SessionCapacity,
): Promise<void> => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${RETENTION.capacityLockPrefix + orgId}, 0))`,
  );
  const active = await countActiveSessions(tx, {
    orgId,
    idleMs: capacity.idleMs,
  });
  if (active >= capacity.max) {
    throw new SessionCapacityExceeded(active, capacity.max);
  }
};
