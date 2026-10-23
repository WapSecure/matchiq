import {
  AuditActorType,
  AuditTargetType,
  type AuditEvent,
  type AuditEventQuery,
  type EditorialStatus,
} from '@matchiq/contracts';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { AUDIT_CURSOR } from '../constants.js';
import type { Database } from '../client.js';
import { InvalidCursorError } from './keyset-cursor.js';
import type {
  AuditPage,
  AuditReader,
  EditorialControlRow,
  EditorialReader,
} from '../editorial-types.js';
import { toEditorialStatus } from '../editorial-types.js';
import type { FixtureKey } from '../ports.js';
import { auditEvents, fixtures } from '../schema/tables.js';
import { fixtureMatch } from './ledger-transaction.js';
import { readControl, readControls } from './editorial-queries.js';
import { withTenant } from './tenant-scope.js';

const a = auditEvents;

interface Cursor {
  readonly at: string;
  readonly id: string;
}

export class InvalidAuditCursorError extends InvalidCursorError {}

export const encodeAuditCursor = (cursor: Cursor): string =>
  Buffer.from(JSON.stringify([cursor.at, cursor.id])).toString(
    AUDIT_CURSOR.encoding,
  );

export const decodeAuditCursor = (raw: string): Cursor => {
  try {
    const value: unknown = JSON.parse(
      Buffer.from(raw, AUDIT_CURSOR.encoding).toString(),
    );
    if (
      Array.isArray(value) &&
      typeof value[0] === 'string' &&
      typeof value[1] === 'string' &&
      !Number.isNaN(Date.parse(value[0])) &&
      AUDIT_CURSOR.idPattern.test(value[1])
    ) {
      return { at: value[0], id: value[1] };
    }
  } catch {
    // Falls through to the typed error below.
  }
  throw new InvalidAuditCursorError(raw);
};

const filters = (orgId: string, q: AuditEventQuery): SQL[] => {
  const where: (SQL | undefined)[] = [
    eq(a.orgId, orgId),
    q.action === undefined ? undefined : eq(a.action, q.action),
    q.actorType === undefined ? undefined : eq(a.actorType, q.actorType),
    q.targetType === undefined ? undefined : eq(a.targetType, q.targetType),
    q.targetId === undefined ? undefined : eq(a.targetId, q.targetId),
    q.fixtureId === undefined ? undefined : eq(a.fixtureId, q.fixtureId),
    q.from === undefined ? undefined : gte(a.createdAt, new Date(q.from)),
    q.to === undefined ? undefined : lte(a.createdAt, new Date(q.to)),
  ];
  if (q.cursor !== undefined) {
    const cursor = decodeAuditCursor(q.cursor);
    where.push(
      sql`(${a.createdAt}, ${a.id}) < (${new Date(cursor.at)}, ${cursor.id}::uuid)`,
    );
  }
  return where.filter((w): w is SQL => w !== undefined);
};

type AuditRow = typeof a.$inferSelect;

const toAuditEvent = (row: AuditRow): AuditEvent => ({
  id: row.id,
  action: row.action,
  actor: { type: AuditActorType.parse(row.actorType), id: row.actor },
  ...(row.actorDisplayName === null
    ? {}
    : { actorDisplayName: row.actorDisplayName }),
  target: { type: AuditTargetType.parse(row.targetType), id: row.targetId },
  fixtureId: row.fixtureId,
  reason: row.reason,
  correlationId: row.correlationId,
  requestId: row.requestId,
  before: row.before,
  after: row.after,
  details: row.details,
  at: row.createdAt.toISOString(),
});

export class PostgresAuditReader implements AuditReader {
  constructor(private readonly db: Database) {}

  /** Newest first; `(created_at, id)` keyset so concurrent inserts never shift pages. */
  async list(orgId: string, query: AuditEventQuery): Promise<AuditPage> {
    const rows = await withTenant(this.db, orgId, (tx) =>
      tx
        .select()
        .from(a)
        .where(and(...filters(orgId, query)))
        .orderBy(desc(a.createdAt), desc(a.id))
        .limit(query.limit + 1),
    );
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return {
      items: page.map(toAuditEvent),
      nextCursor:
        rows.length > query.limit && last
          ? encodeAuditCursor({
              at: last.createdAt.toISOString(),
              id: last.id,
            })
          : null,
    };
  }
}

export class PostgresEditorialReader implements EditorialReader {
  constructor(private readonly db: Database) {}

  status(key: FixtureKey): Promise<EditorialStatus | null> {
    return withTenant(this.db, key.orgId, async (tx) => {
      const [fixture] = await tx
        .select({ fixtureId: fixtures.fixtureId })
        .from(fixtures)
        .where(fixtureMatch(key));
      if (fixture === undefined) return null;
      return toEditorialStatus(key.fixtureId, await readControls(tx, key));
    });
  }

  killSwitch(orgId: string): Promise<EditorialControlRow | null> {
    return withTenant(this.db, orgId, (tx) => readControl(tx, orgId, 'ORG'));
  }
}
