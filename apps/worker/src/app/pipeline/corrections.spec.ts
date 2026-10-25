import type { MatchEvent, StreamMessageType } from '@matchiq/contracts';
import { detectKeyMoments, project } from '@matchiq/football-engine';
import { loadGolden } from '../../test/golden';
import { overlayIdFor } from './artifacts';
import { MatchPipeline } from './match-pipeline';
import { emptyBatch, type PipelineBatch } from './pipeline-batch';

const NOW = '2026-10-23T12:00:00.000Z';

const run = async (events?: (all: MatchEvent[]) => MatchEvent[]) => {
  const file = await loadGolden('disallowed-goal');
  const ordered = events ? events([...file.events]) : file.events;
  const pipeline = new MatchPipeline({
    fixture: file.fixture,
    aiEnabled: false,
    now: () => NOW,
  });
  const batches: PipelineBatch[] = [];
  for (const event of ordered) {
    const batch = emptyBatch();
    pipeline.step(event, batch);
    batches.push(batch);
  }
  return { file, batches };
};

const ofType = (batches: readonly PipelineBatch[], type: StreamMessageType) =>
  batches.flatMap((b) => b.drafts).filter((d) => d.type === type);

describe('corrections downstream of the engine', () => {
  it('retracts the voided goal: insight, live cue and narratives', async () => {
    const { file, batches } = await run();
    const correction = file.events.find((e) => e.type === 'CORRECTION');
    if (correction?.type !== 'CORRECTION') throw new Error('no CORRECTION');
    const goal = batches
      .flatMap((b) => b.insights)
      .find(
        (r) =>
          r.insight.kind === 'GOAL' &&
          r.insight.evidence.eventIds.includes(correction.correctedEventId),
      );
    expect(goal?.insight.kind).toBe('GOAL');
    const insightId = goal?.insight.insightId ?? '';

    const at = batches[correction.sequence];
    expect(at?.retractions).toContainEqual({
      insightId,
      cause: 'CORRECTION',
      causeEventId: correction.eventId,
      reason: correction.reason,
    });
    const milestones = batches
      .flatMap((b) => b.insights)
      .filter(
        (r) =>
          r.insight.kind === 'PLAYER_MILESTONE' &&
          r.insight.evidence.eventIds.includes(correction.correctedEventId),
      );
    expect(milestones.map((r) => r.insight.reasonCode)).toEqual(['FIRST_GOAL']);
    expect(at?.retractions).toHaveLength(1 + milestones.length);
    expect(at?.overlayEnds).toContainEqual(
      expect.objectContaining({
        overlayId: overlayIdFor(insightId),
        status: 'RETRACTED',
      }),
    );
    const pulled = ofType(batches, 'overlay.retract').map((d) => d.payload);
    expect(pulled).toContainEqual(
      expect.objectContaining({
        overlayId: overlayIdFor(insightId),
        cause: 'CORRECTION',
      }),
    );
    expect(ofType(batches, 'insight.retract')).toHaveLength(
      1 + milestones.length,
    );
  });

  it('ends with exactly the moments the corrected ledger supports', async () => {
    const { file, batches } = await run();
    const retracted = new Set(
      batches.flatMap((b) => b.retractions).map((r) => r.insightId),
    );
    const live = batches
      .flatMap((b) => b.insights)
      .map((r) => r.insight.insightId)
      .filter((id) => !retracted.has(id));
    const expected = detectKeyMoments(project(file.fixture, file.events));
    expect(new Set(live)).toEqual(new Set(expected.map((i) => i.insightId)));
  });

  it('is deterministic: a replay gives the same stream', async () => {
    const strip = (batches: readonly PipelineBatch[]) =>
      batches.flatMap((b) => b.drafts).map((d) => [d.type, d.payload]);
    const first = await run();
    const second = await run();
    expect(strip(second.batches)).toEqual(strip(first.batches));
  });

  it('retracts nothing when the correction arrives before its target', async () => {
    const { batches } = await run((all) => {
      const index = all.findIndex((e) => e.type === 'CORRECTION');
      const [correction] = all.splice(index, 1);
      if (correction) all.splice(index - 1, 0, correction);
      return all;
    });
    expect(batches.flatMap((b) => b.retractions)).toEqual([]);
    const goals = batches
      .flatMap((b) => b.insights)
      .filter((r) => r.insight.kind === 'GOAL');
    expect(goals).toHaveLength(3);
  });
});
