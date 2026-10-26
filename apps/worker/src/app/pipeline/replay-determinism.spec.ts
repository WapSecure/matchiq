import { createHash } from 'node:crypto';
import { GOLDEN_SCENARIOS, goldenPipelineRun } from '../../test/golden';

const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

describe('two sessions of the same template', () => {
  it.each(GOLDEN_SCENARIOS)(
    'reach the same scoreboard and snapshot hash for %s',
    async (name) => {
      const first = await goldenPipelineRun(name);
      const second = await goldenPipelineRun(name);

      expect(second.snapshot.score).toEqual(first.snapshot.score);
      expect(second.snapshot.stateHash).toBe(first.snapshot.stateHash);
      expect(digest(second.snapshot)).toBe(digest(first.snapshot));
      expect(digest(second.insights)).toBe(digest(first.insights));
    },
  );
});
