import { asc, isNull, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../client.js';
import type { OutboxRecord, OutboxStore } from '../ports.js';
import { streamMessages } from '../schema/tables.js';

const t = streamMessages;

export class PostgresOutboxStore implements OutboxStore {
  constructor(private readonly db: Database) {}

  /**
   * SKIP LOCKED lets several relays share the table. A crash after publishing
   * but before commit republishes those rows: delivery is at least once and
   * consumers deduplicate on streamSequence (ADR-0005).
   */
  async drain(
    limit: number,
    publish: (record: OutboxRecord) => Promise<void>,
  ): Promise<number> {
    const outcome = await this.db.transaction(async (tx) => {
      const rows = await tx
        .select({
          orgId: t.orgId,
          fixtureId: t.fixtureId,
          message: t.message,
        })
        .from(t)
        .where(isNull(t.publishedAt))
        .orderBy(asc(t.orgId), asc(t.fixtureId), asc(t.streamSequence))
        .limit(limit)
        .for('update', { skipLocked: true });

      const published: ClaimedRow[] = [];
      let failure: unknown;
      for (const row of rows) {
        try {
          await publish({
            key: { orgId: row.orgId, fixtureId: row.fixtureId },
            message: row.message,
          });
        } catch (error) {
          failure = error;
          break;
        }
        published.push(row);
      }
      await markPublished(tx, published);
      return { count: published.length, failure };
    });
    // Rethrown only after commit so rows published before the failure stay marked.
    if (outcome.failure !== undefined) throw outcome.failure;
    return outcome.count;
  }

  /** Unpublished rows and the age of the oldest, for the outbox lag metrics. */
  async backlog(): Promise<OutboxBacklog> {
    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
        oldestAgeSeconds: sql<number>`coalesce(extract(epoch from now() - min(${t.createdAt})), 0)::float8`,
      })
      .from(t)
      .where(isNull(t.publishedAt));
    return row ?? { count: 0, oldestAgeSeconds: 0 };
  }
}

export interface OutboxBacklog {
  readonly count: number;
  readonly oldestAgeSeconds: number;
}

interface ClaimedRow {
  readonly orgId: string;
  readonly fixtureId: string;
  readonly message: OutboxRecord['message'];
}

const markPublished = async (
  tx: Transaction,
  rows: readonly ClaimedRow[],
): Promise<void> => {
  if (rows.length === 0) return;
  const keys = sql.join(
    rows.map(
      (r) =>
        sql`(${r.orgId}, ${r.fixtureId}, ${r.message.streamSequence}::bigint)`,
    ),
    sql`, `,
  );
  await tx
    .update(t)
    .set({ publishedAt: sql`now()` })
    .where(sql`(${t.orgId}, ${t.fixtureId}, ${t.streamSequence}) in (${keys})`);
};
