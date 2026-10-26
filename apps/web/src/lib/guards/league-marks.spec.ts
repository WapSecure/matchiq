// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import {
  DISCLAIMER_LINE,
  IMAGE_IMPORT_PATH,
  LEAGUE_MARK_FILENAME,
  LEAGUE_NAME,
  MARK_REFERENCE,
  SKIPPED_DIRS,
  TEXT_FILE,
} from './league-marks.constants';

const REPO = join(import.meta.dirname, '../../../../..');
const ROOTS = ['apps/web/src', 'apps/web/public'].map((p) => join(REPO, p));
const README = join(REPO, 'README.md');

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRS.has(entry.name)) return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });

const isLeagueMarkLine = (line: string): boolean =>
  !DISCLAIMER_LINE.test(line) &&
  ((LEAGUE_NAME.test(line) && MARK_REFERENCE.test(line)) ||
    IMAGE_IMPORT_PATH.test(line));

const allFiles = [...ROOTS.flatMap(filesUnder), README];

describe('no Premier League marks (spec §12)', () => {
  it('has no file named like a league crest, logo, badge or kit', () => {
    const named = allFiles
      .filter((f) => LEAGUE_MARK_FILENAME.test(basename(f)))
      .map((f) => relative(REPO, f));
    expect(named).toEqual([]);
  });

  it('never pairs the league name with a logo, crest, badge, kit or image path', () => {
    const hits = allFiles
      .filter((f) => TEXT_FILE.test(f))
      .filter((f) => !f.endsWith('league-marks.spec.ts'))
      .filter((f) => !f.endsWith('league-marks.constants.ts'))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ f: relative(REPO, f), n: i + 1, line }))
          .filter(({ line }) => isLeagueMarkLine(line))
          .map(({ f: file, n }) => `${file}:${n}`),
      );
    expect(hits).toEqual([]);
  });

  it('allows the disclaimer but flags a crest reference', () => {
    expect(
      isLeagueMarkLine(
        'MatchIQ is not affiliated with or endorsed by the Premier League.',
      ),
    ).toBe(false);
    expect(
      isLeagueMarkLine('<img src="/premier-league-logo.png" alt="" />'),
    ).toBe(true);
    expect(isLeagueMarkLine('import crest from "./premier-crest.svg"')).toBe(
      true,
    );
    expect(isLeagueMarkLine('Premier League kit colours')).toBe(true);
  });
});
