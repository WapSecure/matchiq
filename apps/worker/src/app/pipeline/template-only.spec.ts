import type { StreamMessageType } from '@matchiq/contracts';
import { loadGolden } from '../../test/golden';
import { FALLBACK_REASONS } from '../constants';
import { MatchPipeline } from './match-pipeline';
import { emptyBatch, type PipelineBatch } from './pipeline-batch';

const NOW = '2026-10-25T12:00:00.000Z';

const run = async (aiEnabled: boolean) => {
  const file = await loadGolden('comeback');
  const pipeline = new MatchPipeline({
    fixture: file.fixture,
    aiEnabled,
    now: () => NOW,
  });
  const batches: PipelineBatch[] = [];
  for (const event of file.events) {
    const batch = emptyBatch();
    pipeline.step(event, batch);
    batches.push(batch);
  }
  return batches;
};

const ofType = (batches: readonly PipelineBatch[], type: StreamMessageType) =>
  batches.flatMap((b) => b.drafts).filter((d) => d.type === type);

describe('milestone moments with AI enabled', () => {
  it('publish standard wording at detection while other moments wait for the agents', async () => {
    const records = (await run(true)).flatMap((b) => b.insights);
    const milestones = records.filter(
      (r) => r.insight.kind === 'PLAYER_MILESTONE',
    );
    const others = records.filter((r) => r.insight.kind !== 'PLAYER_MILESTONE');
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones.every((r) => r.publication === 'TEMPLATE')).toBe(true);
    expect(others.length).toBeGreaterThan(0);
    expect(others.every((r) => r.publication === 'PENDING')).toBe(true);
  });

  it('records why the milestones used standard wording', async () => {
    const batches = await run(true);
    const completions = batches.flatMap((b) => b.completions);
    expect(
      completions.some((c) =>
        JSON.stringify(c).includes(FALLBACK_REASONS.templateOnly),
      ),
    ).toBe(true);
    expect(ofType(batches, 'narrative.ready').length).toBeGreaterThan(0);
  });
});
