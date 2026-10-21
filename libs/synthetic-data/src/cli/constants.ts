import { SCENARIO_NAMES } from '../lib/constants.js';
import type { FixtureManifest } from '../lib/fixture-file.js';

export const EXIT_CODE = { ok: 0, invalid: 1, usage: 2 } as const;

export const CLI_TEXT = {
  generateUsage: `usage: pnpm generate:fixture --seed <non-negative integer> --scenario <${SCENARIO_NAMES.join('|')}> [--out <file>] [--kickoff <ISO-8601 UTC>]`,
  validateUsage: 'usage: pnpm validate:fixture <file> [<file> ...]',
  invalidSeed: (raw: string) =>
    `invalid --seed "${raw}": expected a non-negative integer`,
  invalidScenario: (raw: string) =>
    `invalid --scenario "${raw}": expected one of ${SCENARIO_NAMES.join(', ')}`,
  invalidKickoff: (raw: string) =>
    `invalid --kickoff "${raw}": expected UTC ISO-8601`,
  generated: (path: string, manifest: FixtureManifest) =>
    `wrote ${path}: ${manifest.eventCount} events, score ${manifest.score.home}-${manifest.score.away}, sha256 ${manifest.eventsHash}`,
  valid: (path: string, events: number, home: number, away: number) =>
    `OK ${path}: ${events} events, score ${home}-${away}`,
  invalid: (path: string, count: number) =>
    `INVALID ${path}: ${count} issue(s)`,
  issue: (code: string, message: string, where: string) =>
    `  ${code} ${where}${message}`,
  unreadable: (path: string, reason: string) =>
    `cannot read ${path}: ${reason}`,
} as const;

export const SEED_PATTERN = /^\d{1,10}$/;
export const MAX_SEED = 0xffff_ffff;
export const MAX_PRINTED_ISSUES = 50;
