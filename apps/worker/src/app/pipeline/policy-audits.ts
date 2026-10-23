import { AUDIT_ACTIONS } from '@matchiq/contracts';
import {
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  type AuditEntry,
  type FixtureKey,
} from '@matchiq/db';
import type { PipelineBatch } from './pipeline-batch';

/** Overlay and insight ids whose editorial state the batch depends on. */
export const editorialIds = (batch: PipelineBatch) => ({
  overlayIds: [
    ...new Set([
      ...batch.overlays.map((r) => r.cue.overlayId),
      ...batch.overlayEnds.map((e) => e.overlayId),
    ]),
  ],
  insightIds: [
    ...new Set(batch.overlays.flatMap((r) => r.cue.insightId ?? [])),
  ],
});

/** Gate rejections of agent output are blocks too, so each gets an audit row. */
export const gateAudits = (
  key: FixtureKey,
  batch: PipelineBatch,
): AuditEntry[] =>
  batch.completions.flatMap(({ insightId, completion }) => {
    const { rejected } = completion.gateReport;
    if (rejected.length === 0) return [];
    const run = batch.agentRuns.find((r) => r.insightId === insightId);
    return [
      {
        orgId: key.orgId,
        actor: AUDIT_ACTORS.publishGate,
        actorType: 'SYSTEM' as const,
        action: AUDIT_ACTIONS.publicationGated,
        targetType: AUDIT_TARGET_TYPES.insight,
        targetId: insightId,
        fixtureId: key.fixtureId,
        ...(run?.runs[0] ? { correlationId: run.runs[0].correlationId } : {}),
        details: {
          rejected: rejected.map((r) => ({
            item: r.item,
            source: r.source,
            codes: [...r.codes],
          })),
        },
      },
    ];
  });
