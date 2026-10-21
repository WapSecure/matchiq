import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SCENARIO_NAMES,
  generateFixtureFile,
  hashEvents,
  validateFixtureFile,
} from '../src/index.js';

const FIXTURES_DIR = join(import.meta.dirname, '..', '..', '..', 'fixtures');
const GOLDEN_SEED = 42;

/** Changing the generator must be a deliberate act: regenerate fixtures and update this table. */
const GOLDEN_HASHES: Record<(typeof SCENARIO_NAMES)[number], string> = {
  comeback: 'a9f052c3269591b3895aaf920984c253b233715d9cbb2ed972f68fd5dd7c310c',
  'possession-dominance':
    '9c0e2f1b9801a71328a2fd890fcee37f90370fb9c21c83f63961bc70b475f67b',
  'red-card-swing':
    '75daa5cca013b0f041d4f5875a459876805b116b5a0adee0ba86dbb595632a7b',
  'high-press':
    '09e36e761a82036fea2f2817bc5a510f6810b9f5a30b5865bc4c16a4db0563e1',
  'low-event':
    '1b82c4c9f4956b638190062880dc3ff99912197fcc37f1aab7fcde63ca437d7a',
};

describe.each(SCENARIO_NAMES)('golden fixture %s (seed 42)', (scenario) => {
  const committed: unknown = JSON.parse(
    readFileSync(join(FIXTURES_DIR, `${scenario}.json`), 'utf8'),
  );

  it('validates, including its manifest', () => {
    expect(validateFixtureFile(committed).issues).toEqual([]);
  });

  it('is reproduced exactly by the generator', () => {
    const regenerated = generateFixtureFile({ seed: GOLDEN_SEED, scenario });
    expect(regenerated.manifest.eventsHash).toBe(GOLDEN_HASHES[scenario]);
    expect(hashEvents(regenerated.events)).toBe(GOLDEN_HASHES[scenario]);
    expect(JSON.parse(JSON.stringify(regenerated))).toEqual(committed);
  });
});
