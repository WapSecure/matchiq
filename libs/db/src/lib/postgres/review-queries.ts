import {
  LIMITS,
  OverlayStatus,
  type OverlayCue,
  type OverlayReview,
} from '@matchiq/contracts';
import { and, asc, eq, sql } from 'drizzle-orm';
import type { Executor } from '../client.js';
import type { FixtureKey } from '../ports.js';
import type {
  ApprovedCueWrite,
  ReviewCueRow,
  ReviewTransaction,
  SessionClock,
} from '../review-types.js';
import { overlayCues, replaySessions } from '../schema/intelligence-tables.js';
import { scoped } from './intelligence-rows.js';
import { PostgresLedgerTransaction } from './ledger-transaction.js';

const o = overlayCues;

const reviewColumns = {
  overlayId: o.overlayId,
  insightId: o.insightId,
  revision: o.revision,
  status: o.status,
  editorialState: o.editorialState,
  cue: o.payload,
  period: o.period,
  approvalDeadline: o.approvalDeadline,
};

const toReviewRow = (row: {
  overlayId: string;
  insightId: string | null;
  revision: number;
  status: string;
  editorialState: ReviewCueRow['editorialState'];
  cue: OverlayCue;
  period: number;
  approvalDeadline: Date | null;
}): ReviewCueRow => ({ ...row, status: OverlayStatus.parse(row.status) });

/** Cues waiting for a producer, oldest first; the single slot keeps this short. */
export const readReviews = async (
  db: Executor,
  key: FixtureKey,
): Promise<OverlayReview[]> => {
  const rows = await db
    .select({ ...reviewColumns, updatedAt: o.updatedAt })
    .from(o)
    .where(and(scoped(o, key), eq(o.editorialState, 'AWAITING_APPROVAL')))
    .orderBy(asc(o.updatedAt), asc(o.overlayId))
    .limit(LIMITS.reviewQueueMax);
  return rows.map((row) => ({
    overlayId: row.overlayId,
    insightId: row.insightId,
    fixtureId: key.fixtureId,
    revision: row.revision,
    state: 'AWAITING_APPROVAL',
    cue: row.cue,
    period: row.period,
    expiresAtClockMs: row.cue.clockEndMs,
    waitingSince: row.updatedAt.toISOString(),
    approvalDeadline: row.approvalDeadline?.toISOString() ?? null,
  }));
};

/** Review commands; each runs inside the caller's transaction (ADR-0023). */
export class PostgresReviewTransaction
  extends PostgresLedgerTransaction
  implements ReviewTransaction
{
  async reviewCueOfInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<ReviewCueRow | null> {
    await this.pin.to(key.orgId);
    const [row] = await this.tx
      .select(reviewColumns)
      .from(o)
      .where(and(scoped(o, key), eq(o.insightId, insightId)))
      .for('update');
    return row ? toReviewRow(row) : null;
  }

  async sessionClock(key: FixtureKey): Promise<SessionClock | null> {
    await this.pin.to(key.orgId);
    const [row] = await this.tx
      .select({
        period: replaySessions.period,
        matchClockMs: replaySessions.matchClockMs,
      })
      .from(replaySessions)
      .where(scoped(replaySessions, key));
    return row ?? null;
  }

  async airApproved(key: FixtureKey, write: ApprovedCueWrite): Promise<void> {
    await this.pin.to(key.orgId);
    const { cue } = write;
    await this.tx
      .update(o)
      .set({
        status: 'LIVE',
        editorialState: 'APPROVED',
        editorialReason: write.reason,
        revision: cue.revision,
        priority: cue.priority,
        clockStartMs: cue.clockStartMs,
        clockEndMs: cue.clockEndMs,
        ...(write.period === null ? {} : { period: write.period }),
        payload: cue,
        updatedAt: sql`now()`,
      })
      .where(and(scoped(o, key), eq(o.overlayId, cue.overlayId)));
  }
}
