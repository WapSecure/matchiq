import { and, eq, isNull, lt, lte, ne, or } from 'drizzle-orm';
import type { Executor } from '../client.js';
import type { OverlayRecord } from '../intelligence-types.js';
import type { ApprovalSweep, ApprovalSweepInput } from '../review-types.js';
import { overlayCues } from '../schema/intelligence-tables.js';
import { scoped } from './intelligence-rows.js';
import type { FixtureKey } from '../ports.js';

const o = overlayCues;

/** A revision of a waiting cue carries no deadline, so the first one stands. */
export const withApprovalDeadline = <T extends object>(
  values: T,
  record: OverlayRecord,
): T & { approvalDeadline?: Date } => {
  const deadline = record.editorial?.approvalDeadline;
  return deadline === undefined
    ? values
    : { ...values, approvalDeadline: deadline };
};

const swept = {
  overlayId: o.overlayId,
  insightId: o.insightId,
  revision: o.revision,
};

/**
 * Waiting cues whose wall-clock window has run out (rows stored without a
 * deadline lapse at once), and approved cues whose slot the match clock has left.
 */
export const readApprovalSweep = async (
  db: Executor,
  key: FixtureKey,
  input: ApprovalSweepInput,
): Promise<ApprovalSweep> => {
  const lapsed = await db
    .select(swept)
    .from(o)
    .where(
      and(
        scoped(o, key),
        eq(o.editorialState, 'AWAITING_APPROVAL'),
        or(isNull(o.approvalDeadline), lt(o.approvalDeadline, input.now)),
      ),
    );
  const { clock } = input;
  if (clock === null) return { lapsed, due: [] };
  const due = await db
    .select(swept)
    .from(o)
    .where(
      and(
        scoped(o, key),
        eq(o.editorialState, 'APPROVED'),
        eq(o.status, 'LIVE'),
        or(ne(o.period, clock.period), lte(o.clockEndMs, clock.matchClockMs)),
      ),
    );
  return { lapsed, due };
};
