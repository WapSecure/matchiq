import {
  FixtureStatus,
  type CursorPage,
  type CursorPageQuery,
  type Fixture,
  type MatchEvent,
  type StreamMessage,
} from '@matchiq/contracts';
import { and, asc, eq, gt, lte, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { DB_LIMITS, PAGE_CURSOR } from '../constants.js';
import type {
  EventReader,
  FixtureKey,
  FixtureReader,
  StreamHistory,
  StreamRange,
} from '../ports.js';
import { withTenant } from './tenant-scope.js';
import { fixtures, matchEvents, streamMessages } from '../schema/tables.js';
import { fixtureMatch } from './ledger-transaction.js';
import { cursorAfter, decodeCursor } from './keyset-cursor.js';

/** The status column is authoritative; the stored payload keeps the original. */
const withStatus = (row: { payload: Fixture; status: string }): Fixture => ({
  ...row.payload,
  status: FixtureStatus.parse(row.status),
});

export class PostgresFixtureReader implements FixtureReader {
  constructor(private readonly db: Database) {}

  async get(key: FixtureKey): Promise<Fixture | null> {
    const [row] = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ payload: fixtures.payload, status: fixtures.status })
        .from(fixtures)
        .where(fixtureMatch(key)),
    );
    return row ? withStatus(row) : null;
  }

  async list(orgId: string, limit: number): Promise<Fixture[]> {
    const rows = await withTenant(this.db, orgId, (tx) =>
      tx
        .select({ payload: fixtures.payload, status: fixtures.status })
        .from(fixtures)
        .where(eq(fixtures.orgId, orgId))
        .orderBy(asc(fixtures.kickoffUtc), asc(fixtures.fixtureId))
        .limit(limit),
    );
    return rows.map(withStatus);
  }

  /** Kickoff order with a `(kickoff_utc, fixture_id)` keyset; no total, since sessions add fixtures. */
  async page(
    orgId: string,
    query: CursorPageQuery,
  ): Promise<CursorPage<Fixture>> {
    const kind = PAGE_CURSOR.kinds.fixtures;
    const after =
      query.cursor === undefined
        ? undefined
        : decodeCursor(query.cursor, kind, ['timestamp', 'fixtureId']);
    const rows = await withTenant(this.db, orgId, (tx) =>
      tx
        .select({
          payload: fixtures.payload,
          status: fixtures.status,
          kickoffUtc: fixtures.kickoffUtc,
          fixtureId: fixtures.fixtureId,
        })
        .from(fixtures)
        .where(
          and(
            eq(fixtures.orgId, orgId),
            after === undefined
              ? undefined
              : sql`(${fixtures.kickoffUtc}, ${fixtures.fixtureId}) > (${new Date(after[0] ?? '')}, ${after[1]})`,
          ),
        )
        .orderBy(asc(fixtures.kickoffUtc), asc(fixtures.fixtureId))
        .limit(query.limit + 1),
    );
    const { page, nextCursor } = cursorAfter(
      rows,
      query.limit,
      (row) => [row.kickoffUtc.toISOString(), row.fixtureId],
      kind,
    );
    return { items: page.map(withStatus), nextCursor };
  }
}

export class PostgresEventReader implements EventReader {
  constructor(private readonly db: Database) {}

  async listAfter(
    key: FixtureKey,
    afterSequence: number,
    limit: number,
  ): Promise<MatchEvent[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ payload: matchEvents.payload })
        .from(matchEvents)
        .where(
          and(
            eq(matchEvents.orgId, key.orgId),
            eq(matchEvents.fixtureId, key.fixtureId),
            gt(matchEvents.sequence, afterSequence),
          ),
        )
        .orderBy(asc(matchEvents.sequence))
        .limit(limit),
    );
    return rows.map((r) => r.payload);
  }
}

export class PostgresStreamHistory implements StreamHistory {
  constructor(private readonly db: Database) {}

  async head(key: FixtureKey): Promise<number | null> {
    const [row] = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ head: fixtures.streamHead })
        .from(fixtures)
        .where(fixtureMatch(key)),
    );
    return row ? row.head : null;
  }

  async read(key: FixtureKey, range: StreamRange): Promise<StreamMessage[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ message: streamMessages.message })
        .from(streamMessages)
        .where(
          and(
            eq(streamMessages.orgId, key.orgId),
            eq(streamMessages.fixtureId, key.fixtureId),
            gt(streamMessages.streamSequence, range.after),
            range.upTo === undefined
              ? undefined
              : lte(streamMessages.streamSequence, range.upTo),
          ),
        )
        .orderBy(asc(streamMessages.streamSequence))
        .limit(Math.min(range.limit, DB_LIMITS.streamReadPageMax)),
    );
    return rows.map((r) => r.message);
  }
}
