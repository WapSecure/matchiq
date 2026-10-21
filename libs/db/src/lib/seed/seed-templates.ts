import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Fixture, MatchEvent } from '@matchiq/contracts';
import { FixtureManifest, validateFixtureFile } from '@matchiq/synthetic-data';
import { z } from 'zod';
import { SEED } from '../constants.js';
import type {
  TemplateStore,
  TemplateUpsertOutcome,
} from '../intelligence-types.js';

export interface SeedResult {
  readonly file: string;
  readonly templateId: string;
  readonly eventCount: number;
  readonly outcome: TemplateUpsertOutcome;
}

const FixtureFile = z.object({
  fixture: Fixture,
  events: z.array(MatchEvent),
  manifest: FixtureManifest,
});

export type ParsedFixtureFile = z.infer<typeof FixtureFile>;

export const SEED_ERRORS = {
  invalid: (file: string, issues: string) =>
    `${file} failed validation: ${issues}`,
  notFound: 'fixtures directory not found',
} as const;

/** Walks up from `start` to the first `fixtures/` directory (the workspace root's). */
export const findFixturesFolder = (start: string = process.cwd()): string => {
  let dir = start;
  for (;;) {
    const candidate = join(dir, SEED.fixturesDirectory);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(SEED_ERRORS.notFound);
    dir = parent;
  }
};

/**
 * Validates one golden file with the synthetic-data validator (schema,
 * invariants, manifest hash and score) before it can become a template.
 */
export const loadTemplateFile = async (
  path: string,
): Promise<ParsedFixtureFile> => {
  const raw: unknown = JSON.parse(await readFile(path, SEED.encoding));
  const report = validateFixtureFile(raw);
  if (!report.valid) {
    const issues = report.issues.map((i) => i.message).join('; ');
    throw new Error(SEED_ERRORS.invalid(path, issues));
  }
  return FixtureFile.parse(raw);
};

/** Idempotent: re-seeding unchanged files reports `unchanged` and writes nothing. */
export const seedTemplates = async (
  store: TemplateStore,
  orgId: string,
  folder: string,
): Promise<SeedResult[]> => {
  const files = (await readdir(folder))
    .filter((f) => f.endsWith(SEED.fileSuffix))
    .sort();
  const results: SeedResult[] = [];
  for (const file of files) {
    const { fixture, events, manifest } = await loadTemplateFile(
      join(folder, file),
    );
    const outcome = await store.upsert(orgId, {
      fixture,
      events,
      eventsHash: manifest.eventsHash,
      finalScore: manifest.score,
    });
    results.push({
      file,
      templateId: fixture.fixtureId,
      eventCount: events.length,
      outcome,
    });
  }
  return results;
};
