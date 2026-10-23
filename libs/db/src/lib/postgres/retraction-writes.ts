import type { InsightRetraction } from '@matchiq/contracts';
import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Transaction } from '../client.js';
import type { FixtureKey } from '../ports.js';
import {
  insights,
  narratives,
  overlayCues,
} from '../schema/intelligence-tables.js';

const RETRACTED = 'RETRACTED' as const;

const ofInsight = (
  table: { orgId: PgColumn; fixtureId: PgColumn; insightId: PgColumn },
  key: FixtureKey,
  insightId: string,
) =>
  and(
    eq(table.orgId, key.orgId),
    eq(table.fixtureId, key.fixtureId),
    eq(table.insightId, insightId),
  );

/**
 * A correction outranks a producer suppression, so a suppressed insight is
 * marked RETRACTED too; a held cue never aired and keeps its HELD state.
 */
export const retractInsight = async (
  tx: Transaction,
  key: FixtureKey,
  retraction: InsightRetraction,
): Promise<boolean> => {
  const { insightId, reason } = retraction;
  const changed = await tx
    .update(insights)
    .set({
      status: 'REJECTED',
      editorialState: RETRACTED,
      editorialReason: reason,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        ofInsight(insights, key, insightId),
        or(
          isNull(insights.editorialState),
          ne(insights.editorialState, RETRACTED),
        ),
      ),
    )
    .returning({ insightId: insights.insightId });
  await tx
    .update(narratives)
    .set({ retractedAt: sql`now()` })
    .where(
      and(
        ofInsight(narratives, key, insightId),
        isNull(narratives.retractedAt),
      ),
    );
  await tx
    .update(overlayCues)
    .set({
      editorialState: RETRACTED,
      editorialReason: reason,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        ofInsight(overlayCues, key, insightId),
        isNull(overlayCues.editorialState),
      ),
    );
  return changed.length > 0;
};
