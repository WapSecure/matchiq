import {
  type Fixture,
  type MatchEvent,
  PATTERNS,
  SemVer,
} from '@matchiq/contracts';
import { z } from 'zod';
import {
  type GenerateMatchOptions,
  generateMatch,
} from './engine/generate-match.js';
import { hashEvents } from './hash.js';
import type { FixtureIssue, ValidationReport } from './validation/issues.js';
import { ISSUE_MESSAGES } from './validation/issues.js';
import { analyseFixtureEvents } from './validation/validate-events.js';

const GoalCount = z.int().nonnegative();

export const FixtureManifest = z.strictObject({
  generatorVersion: SemVer,
  seed: z.int().nonnegative(),
  scenario: z.string().min(1),
  eventCount: z.int().nonnegative(),
  eventsHash: z.string().regex(PATTERNS.sha256Hex),
  score: z.strictObject({ home: GoalCount, away: GoalCount }),
});

/** Untrusted file shell; fixture and events are validated by `validateFixtureEvents`. */
const FixtureFileShell = z.strictObject({
  fixture: z.unknown(),
  events: z.array(z.unknown()),
  manifest: FixtureManifest,
});

export type FixtureManifest = z.infer<typeof FixtureManifest>;

export interface FixtureFile {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
  readonly manifest: FixtureManifest;
}

export const generateFixtureFile = (
  options: GenerateMatchOptions,
): FixtureFile => {
  const { fixture, events, score } = generateMatch(options);
  const { provenance } = fixture;
  return {
    fixture,
    events,
    manifest: {
      generatorVersion: provenance.generatorVersion,
      seed: provenance.seed,
      scenario: provenance.scenario,
      eventCount: events.length,
      eventsHash: hashEvents(events),
      score,
    },
  };
};

export const serializeFixtureFile = (file: FixtureFile): string =>
  `${JSON.stringify(file, null, 2)}\n`;

const manifestIssues = (
  manifest: FixtureManifest,
  fixture: Fixture,
  events: readonly MatchEvent[],
  report: ValidationReport,
): FixtureIssue[] => {
  const { provenance } = fixture;
  const checks: [string, boolean][] = [
    [
      'generatorVersion',
      manifest.generatorVersion === provenance.generatorVersion,
    ],
    ['seed', manifest.seed === provenance.seed],
    ['scenario', manifest.scenario === provenance.scenario],
    ['eventCount', manifest.eventCount === events.length],
    ['eventsHash', manifest.eventsHash === hashEvents(events)],
    [
      'score',
      manifest.score.home === report.score?.home &&
        manifest.score.away === report.score.away,
    ],
  ];
  return checks
    .filter(([, ok]) => !ok)
    .map(([field]) => ({
      code: 'MANIFEST_MISMATCH',
      message: ISSUE_MESSAGES.manifest(field),
      path: ['manifest', field],
    }));
};

/** Validates a parsed fixture file, including manifest hash, counts and score. */
export const validateFixtureFile = (raw: unknown): ValidationReport => {
  const shell = FixtureFileShell.safeParse(raw);
  if (!shell.success) {
    return {
      valid: false,
      issues: shell.error.issues.map((issue) => ({
        code: 'SCHEMA_INVALID',
        message: issue.message,
        path: issue.path,
      })),
      score: null,
      eventCount: 0,
    };
  }
  const { fixture, events, manifest } = shell.data;
  const { report, data } = analyseFixtureEvents(fixture, events);
  if (data === null) return report;
  const issues = [
    ...report.issues,
    ...manifestIssues(manifest, data.fixture, data.events, report),
  ];
  return { ...report, valid: issues.length === 0, issues };
};
