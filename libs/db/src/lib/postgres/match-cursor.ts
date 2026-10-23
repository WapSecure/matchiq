import type { CursorPage, CursorPageQuery } from '@matchiq/contracts';
import { sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Database, Transaction } from '../client.js';
import type { FixtureKey } from '../ports.js';
import {
  cursorAfter,
  decodeCursor,
  InvalidCursorError,
  type CursorKind,
  type CursorPart,
} from './keyset-cursor.js';
import { withTenant } from './tenant-scope.js';

export interface PageSpec<R, T> {
  readonly key: FixtureKey;
  readonly query: CursorPageQuery;
  readonly kind: CursorKind;
  /** Types of the sort key, after the fixture id the cursor is bound to. */
  readonly shape: readonly CursorPart[];
  /** The ascending sort key, in order; the last column is unique per fixture. */
  readonly columns: readonly PgColumn[];
  readonly read: (
    tx: Transaction,
    after: SQL | undefined,
    limit: number,
  ) => Promise<R[]>;
  readonly total: (tx: Transaction) => Promise<number>;
  readonly keyOf: (row: R) => string[];
  readonly item: (rows: R[], tx: Transaction) => T[] | Promise<T[]>;
}

type PositionSpec = Pick<
  PageSpec<unknown, unknown>,
  'key' | 'kind' | 'shape' | 'columns'
>;

/**
 * Cursor `[kind, fixtureId, ...sort key]`. Binding the fixture id means a
 * cursor taken from one match is refused by another, not silently misapplied.
 */
const afterOf = (
  raw: string | undefined,
  spec: PositionSpec,
): SQL | undefined => {
  if (raw === undefined) return undefined;
  const [fixtureId, ...position] = decodeCursor(raw, spec.kind, [
    'fixtureId',
    ...spec.shape,
  ]);
  if (fixtureId !== spec.key.fixtureId) throw new InvalidCursorError(raw);
  const values = position.map((value, i) =>
    spec.shape[i] === 'integer' ? Number(value) : value,
  );
  const columns = sql.join([...spec.columns], sql`, `);
  const bound = sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
  return sql`(${columns}) > (${bound})`;
};

/** Reads one row past the limit to learn whether another page follows. */
export const keysetPage = async <R, T>(
  db: Database,
  spec: PageSpec<R, T>,
): Promise<CursorPage<T>> => {
  const { limit, cursor } = spec.query;
  const after = afterOf(cursor, spec);
  const { read, total, items } = await withTenant(
    db,
    spec.key.orgId,
    async (tx) => {
      const rows = await spec.read(tx, after, limit + 1);
      return {
        read: rows,
        total: await spec.total(tx),
        items: await spec.item(rows.slice(0, limit), tx),
      };
    },
  );
  const { nextCursor } = cursorAfter(
    read,
    limit,
    (row) => [spec.key.fixtureId, ...spec.keyOf(row)],
    spec.kind,
  );
  return { items, nextCursor, total };
};
