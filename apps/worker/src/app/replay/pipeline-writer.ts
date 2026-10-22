import {
  appendReplayedEvents,
  REPLAY_INGESTION_PREFIX,
  type AuditEntry,
  type FixtureKey,
  type PipelineTransaction,
  type PipelineUnitOfWork,
} from '@matchiq/db';
import {
  applyEditorialPolicy,
  editorialIds,
  gateAudits,
} from '../pipeline/editorial-policy';
import type { PipelineBatch } from '../pipeline/pipeline-batch';

export type WriteOutcome = 'written' | 'already-applied' | 'already-published';

class SkipBatch extends Error {
  constructor(readonly outcome: Exclude<WriteOutcome, 'written'>) {
    super(outcome);
  }
}

const claimAll = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
): Promise<void> => {
  for (const claim of batch.claims) {
    if (!(await tx.claimPublication(key, claim.insightId, claim.publication))) {
      throw new SkipBatch('already-published');
    }
  }
};

const appendEvents = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
): Promise<void> => {
  if (batch.events.length === 0) return;
  const first = batch.events[0]?.sequence ?? 0;
  const fresh = await appendReplayedEvents(
    tx,
    key,
    `${REPLAY_INGESTION_PREFIX}${key.fixtureId}_${first}`,
    batch.events,
  );
  // A retried batch whose first attempt committed: everything else in it is written too.
  if (fresh.length === 0) throw new SkipBatch('already-applied');
};

const writeArtifacts = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
): Promise<void> => {
  await tx.insertInsights(key, batch.insights);
  await tx.insertNarratives(key, batch.narratives);
  for (const record of batch.overlays) await tx.upsertOverlay(key, record);
  for (const end of batch.overlayEnds) {
    await tx.endOverlay(key, end.overlayId, end);
  }
  for (const { insightId, completion } of batch.completions) {
    await tx.completeInsight(key, insightId, completion);
  }
  for (const { insightId, runs } of batch.agentRuns) {
    await tx.insertAgentRuns(key, insightId, runs);
  }
  if (batch.snapshot !== null) await tx.saveSnapshot(key, batch.snapshot);
  if (batch.status !== null) await tx.updateSession(key, batch.status);
  // After the status: a batch may start with a command and continue with events.
  const last = batch.events.at(-1);
  if (last !== undefined) {
    await tx.updateSessionProgress(key, {
      appliedSequence: last.sequence,
      period: last.period,
      matchClockMs: last.matchClockMs,
    });
  }
};

/** Applies producer state read under the fixture lock; batches with no cue skip the reads. */
const editorialBatch = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
): Promise<{ batch: PipelineBatch; audits: AuditEntry[] }> => {
  const ids = editorialIds(batch);
  const gated = gateAudits(key, batch);
  if (ids.overlayIds.length === 0) return { batch, audits: gated };
  const view = await tx.editorialView(key, ids.overlayIds, ids.insightIds);
  const outcome = applyEditorialPolicy(key, view, batch);
  return { batch: outcome.batch, audits: [...outcome.audits, ...gated] };
};

/**
 * Commits one pipeline batch atomically: ledger events with their
 * `match.event` messages (ADR-0006), every derived stream message, and the
 * read models behind the REST endpoints, filtered by editorial policy, plus
 * the audit rows for every block. The fixture row lock serialises it with
 * other writers of the same stream, including producer commands.
 */
export class PipelineWriter {
  constructor(private readonly uow: PipelineUnitOfWork) {}

  async write(key: FixtureKey, batch: PipelineBatch): Promise<WriteOutcome> {
    try {
      await this.uow.transaction(async (tx) => {
        if (!(await tx.lockFixture(key))) {
          throw new Error(`Unknown fixture ${key.fixtureId}`);
        }
        await claimAll(tx, key, batch);
        await appendEvents(tx, key, batch);
        const effective = await editorialBatch(tx, key, batch);
        await tx.appendStreamMessages(key, effective.batch.drafts);
        await writeArtifacts(tx, key, effective.batch);
        await tx.appendAudits(effective.audits);
      });
    } catch (error) {
      if (error instanceof SkipBatch) return error.outcome;
      throw error;
    }
    for (const effect of batch.afterCommit) effect();
    return 'written';
  }
}
