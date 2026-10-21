import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ApiEnv, WebPublicEnv, WorkerEnv, loadEnv } from '../index.js';

const EXAMPLE_PATH = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  '.env.example',
);
const SECRET_KEYS = ['OPERATOR_API_KEY', 'AGENTS_SERVICE_TOKEN'] as const;

const parseDotenv = (text: string): Record<string, string> =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [
        line.slice(0, line.indexOf('=')),
        line.slice(line.indexOf('=') + 1),
      ]),
  );

/** A fresh clone runs `cp .env.example .env` and fills only the secrets. */
const exampleEnv = (): Record<string, string> => {
  const env = parseDotenv(readFileSync(EXAMPLE_PATH, 'utf8'));
  for (const key of SECRET_KEYS) env[key] = 's'.repeat(32);
  return env;
};

describe('.env.example', () => {
  it.each([
    ['api', ApiEnv],
    ['worker', WorkerEnv],
    ['web', WebPublicEnv],
  ] as const)(
    'is accepted by the %s schema once secrets are filled',
    (_, schema) => {
      expect(() => loadEnv(schema, exampleEnv())).not.toThrow();
    },
  );
});
