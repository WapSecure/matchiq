import { OverlayStatus } from '@matchiq/contracts';
import { and, asc, eq, ne, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '../client.js';
import type {
  EditorialControlRow,
  EditorialControls,
  EditorialControlWrite,
  EditorialScope,
  EditorialTransaction,
  EditorialUnitOfWork,
  InsightRow,
  OverlayEditorialWrite,
  OverlayRow,
} from '../editorial-types.js';
import type { FixtureKey } from '../ports.js';
import { editorialControls } from '../schema/editorial-tables.js';
import {
  insights,
  overlayCues,
  replaySessions,
} from '../schema/intelligence-tables.js';
import {
  controlColumns,
  controlMatch,
  readControls,
} from './editorial-queries.js';
import { PostgresLedgerTransaction } from './ledger-transaction.js';

const scoped = (
  table: { orgId: PgColumn; fixtureId: PgColumn },
  key: FixtureKey,
) => and(eq(table.orgId, key.orgId), eq(table.fixtureId, key.fixtureId));

const overlayColumns = {
  overlayId: overlayCues.overlayId,
  insightId: overlayCues.insightId,
  revision: overlayCues.revision,
  status: overlayCues.status,
  editorialState: overlayCues.editorialState,
};

const toOverlayRow = (row: {
  overlayId: string;
  insightId: string | null;
  revision: number;
  status: string;
  editorialState: OverlayRow['editorialState'];
}): OverlayRow => ({ ...row, status: OverlayStatus.parse(row.status) });

class PostgresEditorialTransaction
  extends PostgresLedgerTransaction
  implements EditorialTransaction
{
  async fixtureOfOverlay(
    orgId: string,
    overlayId: string,
  ): Promise<string | null> {
    const [row] = await this.tx
      .select({ fixtureId: overlayCues.fixtureId })
      .from(overlayCues)
      .where(
        and(eq(overlayCues.orgId, orgId), eq(overlayCues.overlayId, overlayId)),
      )
      .limit(1);
    return row?.fixtureId ?? null;
  }

  async fixtureOfInsight(
    orgId: string,
    insightId: string,
  ): Promise<string | null> {
    const [row] = await this.tx
      .select({ fixtureId: insights.fixtureId })
      .from(insights)
      .where(and(eq(insights.orgId, orgId), eq(insights.insightId, insightId)))
      .limit(1);
    return row?.fixtureId ?? null;
  }

  async overlayForUpdate(
    key: FixtureKey,
    overlayId: string,
  ): Promise<OverlayRow | null> {
    const [row] = await this.tx
      .select(overlayColumns)
      .from(overlayCues)
      .where(
        and(scoped(overlayCues, key), eq(overlayCues.overlayId, overlayId)),
      )
      .for('update');
    return row ? toOverlayRow(row) : null;
  }

  async overlayOfInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<OverlayRow | null> {
    const [row] = await this.tx
      .select(overlayColumns)
      .from(overlayCues)
      .where(
        and(scoped(overlayCues, key), eq(overlayCues.insightId, insightId)),
      )
      .for('update');
    return row ? toOverlayRow(row) : null;
  }

  async insightForUpdate(
    key: FixtureKey,
    insightId: string,
  ): Promise<InsightRow | null> {
    const [row] = await this.tx
      .select({
        insightId: insights.insightId,
        publication: insights.publication,
        status: insights.status,
        editorialState: insights.editorialState,
      })
      .from(insights)
      .where(and(scoped(insights, key), eq(insights.insightId, insightId)))
      .for('update');
    return row ?? null;
  }

  async liveOverlays(key: FixtureKey): Promise<OverlayRow[]> {
    const rows = await this.tx
      .select(overlayColumns)
      .from(overlayCues)
      .where(and(scoped(overlayCues, key), eq(overlayCues.status, 'LIVE')))
      .orderBy(asc(overlayCues.overlayId))
      .for('update');
    return rows.map(toOverlayRow);
  }

  async markOverlay(
    key: FixtureKey,
    overlayId: string,
    write: OverlayEditorialWrite,
  ): Promise<void> {
    await this.tx
      .update(overlayCues)
      .set({
        status: write.status,
        editorialState: write.state,
        editorialReason: write.reason,
        ...(write.endReason === undefined
          ? {}
          : { endReason: write.endReason }),
        updatedAt: sql`now()`,
      })
      .where(
        and(scoped(overlayCues, key), eq(overlayCues.overlayId, overlayId)),
      );
  }

  async suppressInsight(
    key: FixtureKey,
    insightId: string,
    reason: string,
  ): Promise<void> {
    await this.tx
      .update(insights)
      .set({
        status: 'REJECTED',
        editorialState: 'SUPPRESSED',
        editorialReason: reason,
        updatedAt: sql`now()`,
      })
      .where(and(scoped(insights, key), eq(insights.insightId, insightId)));
  }

  async controlForUpdate(
    orgId: string,
    scope: EditorialScope,
    scopeId: string,
  ): Promise<EditorialControlRow | null> {
    const [row] = await this.tx
      .select(controlColumns)
      .from(editorialControls)
      .where(controlMatch(orgId, scope, scopeId))
      .for('update');
    return row ?? null;
  }

  async saveControl(
    write: EditorialControlWrite,
  ): Promise<EditorialControlRow> {
    const values = {
      active: write.active,
      reason: write.reason,
      changedBy: write.changedBy,
      changedAt: sql`now()`,
    };
    const [row] = await this.tx
      .insert(editorialControls)
      .values({
        orgId: write.orgId,
        scopeType: write.scope,
        scopeId: write.scopeId,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          editorialControls.orgId,
          editorialControls.scopeType,
          editorialControls.scopeId,
        ],
        set: values,
      })
      .returning(controlColumns);
    if (!row) throw new Error('editorial control upsert returned no row');
    return row;
  }

  controls(key: FixtureKey): Promise<EditorialControls> {
    return readControls(this.tx, key);
  }

  async activeSessionIds(orgId: string): Promise<string[]> {
    const rows = await this.tx
      .select({ fixtureId: replaySessions.fixtureId })
      .from(replaySessions)
      .where(
        and(
          eq(replaySessions.orgId, orgId),
          ne(replaySessions.state, 'COMPLETED'),
        ),
      )
      .orderBy(asc(replaySessions.fixtureId));
    return rows.map((r) => r.fixtureId);
  }
}

export class PostgresEditorialUnitOfWork implements EditorialUnitOfWork {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: EditorialTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      work(new PostgresEditorialTransaction(tx)),
    );
  }
}
