import { AUDIT_ACTIONS, type InsightRetraction } from '@matchiq/contracts';
import {
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type AuditEntry,
  type FixtureKey,
  type PipelineTransaction,
} from '@matchiq/db';
import { overlayIdFor } from './artifacts';
import type { PipelineBatch } from './pipeline-batch';

const auditOf = (
  key: FixtureKey,
  retraction: InsightRetraction,
  batch: PipelineBatch,
): AuditEntry => {
  const overlayId = overlayIdFor(retraction.insightId);
  const pulled = batch.overlayEnds.some(
    (end) => end.overlayId === overlayId && end.status === 'RETRACTED',
  );
  return {
    orgId: key.orgId,
    actor: AUDIT_ACTORS.worker,
    actorType: 'SYSTEM',
    action: AUDIT_ACTIONS.insightRetracted,
    targetType: AUDIT_TARGET_TYPES.insight,
    targetId: retraction.insightId,
    fixtureId: key.fixtureId,
    reason: retraction.reason,
    after: { status: 'REJECTED', editorialState: 'RETRACTED' },
    details: {
      cause: retraction.cause,
      causeEventId: retraction.causeEventId,
      overlayId,
      pulledFromAir: pulled,
    },
  };
};

/**
 * Applies the batch's correction retractions after its artifacts are written,
 * so a moment detected and ruled out in one batch ends retracted. A retraction
 * that changes nothing (a retried or replayed batch) writes no audit row.
 */
export const writeRetractions = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
): Promise<AuditEntry[]> => {
  const audits: AuditEntry[] = [];
  for (const retraction of batch.retractions) {
    if (await tx.retractInsight(key, retraction)) {
      audits.push(auditOf(key, retraction, batch));
    }
  }
  return audits;
};
