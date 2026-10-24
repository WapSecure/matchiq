import {
  appendReplayedEvents,
  REPLAY_INGESTION_PREFIX,
  type AuditEntry,
  type FixtureKey,
  type PipelineTransaction,
  type PipelineUnitOfWork,
} from '@matchiq/db';
import { DEFAULT_APPROVAL_WINDOW_MS } from '../constants';
import { sweepOutcome } from '../pipeline/approval-sweep';
import {
  applyEditorialPolicy,
  type ApprovalTiming,
  editorialIds,
  gateAudits,
} from '../pipeline/editorial-policy';
import type { PipelineBatch } from '../pipeline/pipeline-batch';
import { writeRetractions } from '../pipeline/retractions';

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
  for (const { insightId, steps } of batch.agentSteps) {
    await tx.insertAgentSteps(key, insightId, steps);
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

/** Wall clock and approval window for MANUAL cues (ADR-0024). */
interface ApprovalClock {
  readonly now: () => number;
  readonly windowMs: number;
}

/** Applies producer state read under the fixture lock; batches with no cue skip the view. */
const editorialBatch = async (
  tx: PipelineTransaction,
  key: FixtureKey,
  batch: PipelineBatch,
  clock: ApprovalClock,
): Promise<{ batch: PipelineBatch; audits: AuditEntry[] }> => {
  const nowMs = clock.now();
  const timing: ApprovalTiming = { nowMs, windowMs: clock.windowMs };
  const ids = editorialIds(batch);
  const gated = gateAudits(key, batch);
  const last = batch.events.at(-1);
  const sweep = sweepOutcome(
    key,
    await tx.approvalSweep(key, {
      now: new Date(nowMs),
      clock: last
        ? { period: last.period, matchClockMs: last.matchClockMs }
        : null,
    }),
    new Date(nowMs).toISOString(),
  );
  let audits = gated;
  let effective = batch;
  if (ids.overlayIds.length > 0) {
    const view = await tx.editorialView(key, ids.overlayIds, ids.insightIds);
    const outcome = applyEditorialPolicy(key, view, batch, timing);
    effective = outcome.batch;
    audits = [...outcome.audits, ...gated];
  }
  return {
    batch: {
      ...effective,
      drafts: [...effective.drafts, ...sweep.drafts],
      overlayEnds: [...effective.overlayEnds, ...sweep.ends],
    },
    audits: [...audits, ...sweep.audits],
  };
};

/**
 * Commits one pipeline batch atomically: ledger events with their
 * `match.event` messages (ADR-0006), every derived stream message, and the
 * read models behind the REST endpoints, filtered by editorial policy, plus
 * the audit rows for every block. The fixture row lock serialises it with
 * other writers of the same stream, including producer commands.
 */
export class PipelineWriter {
  private readonly approval: ApprovalClock;

  constructor(
    private readonly uow: PipelineUnitOfWork,
    windowSeconds = DEFAULT_APPROVAL_WINDOW_MS / 1000,
    now: () => number = Date.now,
  ) {
    this.approval = { now, windowMs: windowSeconds * 1000 };
  }

  async write(key: FixtureKey, batch: PipelineBatch): Promise<WriteOutcome> {
    try {
      await this.uow.transaction(async (tx) => {
        if (!(await tx.lockFixture(key))) {
          throw new Error(`Unknown fixture ${key.fixtureId}`);
        }
        await claimAll(tx, key, batch);
        await appendEvents(tx, key, batch);
        const effective = await editorialBatch(tx, key, batch, this.approval);
        await tx.appendStreamMessages(key, effective.batch.drafts);
        await writeArtifacts(tx, key, effective.batch);
        const retracted = await writeRetractions(tx, key, effective.batch);
        await tx.appendAudits([...effective.audits, ...retracted]);
      });
    } catch (error) {
      if (error instanceof SkipBatch) return error.outcome;
      throw error;
    }
    for (const effect of batch.afterCommit) effect();
    return 'written';
  }
}
