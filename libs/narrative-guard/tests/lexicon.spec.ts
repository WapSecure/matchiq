import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FORBIDDEN_LEXICON,
  LEXICON_FILE_NAME,
  SAFETY_LEXICON,
  compilePattern,
  serializeLexicon,
} from '../src/index.js';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SHARED = join(ROOT, 'libs/narrative-guard/generated', LEXICON_FILE_NAME);
const PYTHON = join(
  ROOT,
  'apps/agents/src/matchiq_agents/contracts/generated/narrative_lexicon.json',
);

describe('shared lexicon', () => {
  it('matches the generated file the Python guard loads (run pnpm codegen)', () => {
    expect(readFileSync(SHARED, 'utf8')).toBe(serializeLexicon());
    expect(readFileSync(PYTHON, 'utf8')).toBe(serializeLexicon());
  });

  it('compiles every pattern in the shared dialect', () => {
    const all = [
      ...Object.values(FORBIDDEN_LEXICON),
      ...Object.values(SAFETY_LEXICON),
    ].flat();
    for (const pattern of all) {
      expect(() => compilePattern(pattern)).not.toThrow();
    }
  });

  it('treats \\w as Unicode, like Python', () => {
    expect(compilePattern(String.raw`lesi[oó]n\w*`).test('lesiónés')).toBe(
      true,
    );
    expect(compilePattern('odds').test('oddsé')).toBe(false);
    expect(compilePattern('bet').test('alphabet')).toBe(false);
  });
});
