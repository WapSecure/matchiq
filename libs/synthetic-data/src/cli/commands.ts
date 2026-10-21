import { parseArgs } from 'node:util';
import { UtcTimestamp } from '@matchiq/contracts';
import {
  generateFixtureFile,
  serializeFixtureFile,
  validateFixtureFile,
} from '../lib/fixture-file.js';
import { isScenarioName } from '../lib/scenarios.js';
import type { ValidationReport } from '../lib/validation/issues.js';
import {
  CLI_TEXT,
  EXIT_CODE,
  MAX_PRINTED_ISSUES,
  MAX_SEED,
  SEED_PATTERN,
} from './constants.js';

export interface CliIo {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  readonly readFile: (path: string) => Promise<string>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
}

type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];

const usageError = (io: CliIo, message: string, usage: string): ExitCode => {
  io.err(message);
  io.err(usage);
  return EXIT_CODE.usage;
};

export const runGenerate = async (
  argv: readonly string[],
  io: CliIo,
): Promise<ExitCode> => {
  let values: {
    seed?: string;
    scenario?: string;
    out?: string;
    kickoff?: string;
  };
  try {
    ({ values } = parseArgs({
      args: [...argv],
      options: {
        seed: { type: 'string' },
        scenario: { type: 'string' },
        out: { type: 'string' },
        kickoff: { type: 'string' },
      },
      strict: true,
    }));
  } catch (error) {
    return usageError(io, String(error), CLI_TEXT.generateUsage);
  }
  const seedRaw = values.seed ?? '';
  const seed = Number(seedRaw);
  if (!SEED_PATTERN.test(seedRaw) || seed > MAX_SEED) {
    return usageError(
      io,
      CLI_TEXT.invalidSeed(seedRaw),
      CLI_TEXT.generateUsage,
    );
  }
  const scenario = values.scenario ?? '';
  if (!isScenarioName(scenario)) {
    return usageError(
      io,
      CLI_TEXT.invalidScenario(scenario),
      CLI_TEXT.generateUsage,
    );
  }
  if (
    values.kickoff !== undefined &&
    !UtcTimestamp.safeParse(values.kickoff).success
  ) {
    return usageError(
      io,
      CLI_TEXT.invalidKickoff(values.kickoff),
      CLI_TEXT.generateUsage,
    );
  }

  const file = generateFixtureFile({
    seed,
    scenario,
    ...(values.kickoff === undefined ? {} : { kickoffUtc: values.kickoff }),
  });
  const content = serializeFixtureFile(file);
  if (values.out === undefined) {
    io.out(content);
    return EXIT_CODE.ok;
  }
  await io.writeFile(values.out, content);
  io.out(CLI_TEXT.generated(values.out, file.manifest));
  return EXIT_CODE.ok;
};

const printReport = (
  io: CliIo,
  path: string,
  report: ValidationReport,
): void => {
  if (report.valid && report.score !== null) {
    io.out(
      CLI_TEXT.valid(
        path,
        report.eventCount,
        report.score.home,
        report.score.away,
      ),
    );
    return;
  }
  io.err(CLI_TEXT.invalid(path, report.issues.length));
  for (const issue of report.issues.slice(0, MAX_PRINTED_ISSUES)) {
    const where =
      issue.sequence === undefined
        ? (issue.path ?? []).map(String).join('.')
        : `#${issue.sequence}`;
    io.err(
      CLI_TEXT.issue(
        issue.code,
        issue.message,
        where === '' ? '' : `${where} `,
      ),
    );
  }
};

const validateOne = async (path: string, io: CliIo): Promise<boolean> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await io.readFile(path));
  } catch (error) {
    io.err(
      CLI_TEXT.unreadable(
        path,
        error instanceof Error ? error.message : String(error),
      ),
    );
    return false;
  }
  const report = validateFixtureFile(parsed);
  printReport(io, path, report);
  return report.valid;
};

export const runValidate = async (
  argv: readonly string[],
  io: CliIo,
): Promise<ExitCode> => {
  const paths = argv.filter((arg) => arg !== '--');
  if (paths.length === 0 || paths.some((p) => p.startsWith('-'))) {
    io.err(CLI_TEXT.validateUsage);
    return EXIT_CODE.usage;
  }
  let allValid = true;
  for (const path of paths) {
    allValid = (await validateOne(path, io)) && allValid;
  }
  return allValid ? EXIT_CODE.ok : EXIT_CODE.invalid;
};
