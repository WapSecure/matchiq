import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CROSS_LANGUAGE_CONTRACTS,
  type CrossLanguageContractName,
} from '../src/index.js';

const SAMPLES_DIR = join(import.meta.dirname, '..', 'samples');

/** The same files are validated by the Python agents service to prove contract parity. */
describe('shared contract samples', () => {
  const files = readdirSync(SAMPLES_DIR).filter((f) => f.endsWith('.json'));

  it('has samples to validate', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s parses with its Zod contract', (file) => {
    const name = file.split('.')[0] as CrossLanguageContractName;
    const payload: unknown = JSON.parse(
      readFileSync(join(SAMPLES_DIR, file), 'utf8'),
    );
    expect(CROSS_LANGUAGE_CONTRACTS[name].safeParse(payload).success).toBe(
      true,
    );
  });
});
