import { PipelineStatus } from '@matchiq/contracts';
import { and, asc, eq, lt, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DatabaseHandle, Transaction } from '../client.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  RETENTION,
} from '../constants.js';
import type {
  PendingInsightRef,
  RetentionCounts,
  RetentionStore,
} from '../operations-types.js';
import type { AuditEntry, FixtureKey } from '../ports.js';
import {
  agentRuns,
  insights,
  matchRecaps,
  matchSnapshots,
  narratives,
  overlayCues,
  replaySessions,
} from '../schema/intelligence-tables.js';
import {
  auditEvents,
  fixtures,
  idempotencyKeys,
  matchEvents,
  streamMessages,
} from '../schema/tables.js';

type Scoped = PgTable & { orgId: PgColumn; fixtureId: PgColumn };

const keyIn = (table: Scoped, keys: readonly FixtureKey[]): SQL =>
  sql`(${table.orgId}, ${table.fixtureId}) in (${sql.join(
    keys.map((k) => sql`(${k.orgId}, ${k.fixtureId})`),
    sql`, `,
  )})`;

const deleteFrom = async (
  tx: Transaction,
  table: Scoped,
  keys: readonly FixtureKey[],
): Promise<number> =>
  (await tx.delete(table).where(keyIn(table, keys))).rowCount ?? 0;

/**
 * Children are deleted explicitly, in dependency order, so the audit records
 * exact counts; the ON DELETE CASCADE foreign keys (migration 0002) are the
 * safety net that keeps a fixture delete complete if a table is added later.
 */
const deleteBatch = async (
  tx: Transaction,
  keys: readonly FixtureKey[],
): Promise<RetentionCounts> => {
  const narrativesDeleted = await deleteFrom(tx, narratives, keys);
  const agentRunsDeleted = await deleteFrom(tx, agentRuns, keys);
  const overlays = await deleteFrom(tx, overlayCues, keys);
  const insightsDeleted = await deleteFrom(tx, insights, keys);
  const snapshots = await deleteFrom(tx, matchSnapshots, keys);
  const recaps = await deleteFrom(tx, matchRecaps, keys);
  const streamDeleted = await deleteFrom(tx, streamMessages, keys);
  const events = await deleteFrom(tx, matchEvents, keys);
  const sessions = await deleteFrom(tx, replaySessions, keys);
  const fixturesDeleted = await deleteFrom(tx, fixtures, keys);
  return {
    sessions,
    fixtures: fixturesDeleted,
    events,
    streamMessages: streamDeleted,
    insights: insightsDeleted,
    narratives: narrativesDeleted,
    overlays,
    agentRuns: agentRunsDeleted,
    snapshots,
    recaps,
  };
};

export class PostgresRetentionStore implements RetentionStore {
  constructor(private readonly handle: DatabaseHandle) {}

  async exclusive<T>(work: () => Promise<T>): Promise<T | null> {
    const client = await this.handle.pool.connect();
    try {
      const { rows } = await client.query<{ locked: boolean }>(
        'select pg_try_advisory_lock(hashtextextended($1, 0)) as locked',
        [RETENTION.advisoryLockName],
      );
      if (rows[0]?.locked !== true) return null;
      try {
        return await work();
      } finally {
        await client.query(
          'select pg_advisory_unlock(hashtextextended($1, 0))',
          [RETENTION.advisoryLockName],
        );
      }
    } finally {
      client.release();
    }
  }

  async expiredSessions(
    cutoff: Date,
    limit: number,
  ): Promise<readonly FixtureKey[]> {
    return this.handle.db
      .select({
        orgId: replaySessions.orgId,
        fixtureId: replaySessions.fixtureId,
      })
      .from(replaySessions)
      .where(lt(replaySessions.updatedAt, cutoff))
      .orderBy(asc(replaySessions.updatedAt))
      .limit(limit);
  }

  deleteSessions(keys: readonly FixtureKey[]): Promise<RetentionCounts> {
    return this.handle.db.transaction(async (tx) => {
      const counts = await deleteBatch(tx, keys);
      for (const orgId of new Set(keys.map((k) => k.orgId))) {
        await tx.insert(auditEvents).values({
          orgId,
          actor: AUDIT_ACTORS.retention,
          actorType: 'SYSTEM',
          action: AUDIT_ACTIONS.sessionsPurged,
          targetType: AUDIT_TARGET_TYPES.retention,
          targetId: RETENTION.sessionsTarget,
          details: {
            sessionIds: keys
              .filter((k) => k.orgId === orgId)
              .map((k) => k.fixtureId),
            ...counts,
          },
        });
      }
      return counts;
    });
  }

  async pruneIdempotencyKeys(cutoff: Date, limit: number): Promise<number> {
    const k = idempotencyKeys;
    const result = await this.handle.db.execute(
      sql`delete from ${k} where (${k.orgId}, ${k.scope}, ${k.key}) in (
        select ${k.orgId}, ${k.scope}, ${k.key} from ${k}
        where ${k.createdAt} < ${cutoff} limit ${limit})`,
    );
    return result.rowCount ?? 0;
  }

  async pendingInsights(
    orgId: string,
    limit: number,
  ): Promise<PendingInsightRef[]> {
    const rows = await this.handle.db
      .select()
      .from(insights)
      .where(
        and(eq(insights.orgId, orgId), eq(insights.publication, 'PENDING')),
      )
      .orderBy(asc(insights.createdAt))
      .limit(limit);
    return rows.map((row) => ({
      key: { orgId: row.orgId, fixtureId: row.fixtureId },
      createdAt: row.createdAt,
      // Columns are authoritative; payloads stored before MQ-024 have no period.
      insight: {
        ...row.payload,
        period: row.period,
        status: PipelineStatus.parse(row.status),
      },
      revision: row.revision,
    }));
  }

  async audit(entry: AuditEntry): Promise<void> {
    await this.handle.db.insert(auditEvents).values({
      ...entry,
      actorType: entry.actorType ?? 'SYSTEM',
      requestId: entry.requestId ?? null,
    });
  }
}
