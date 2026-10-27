// Validates JSON bodies with the worker's real Zod contracts: stdin {contract, items}, stdout one issue list per item.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'libs',
  'contracts',
  'dist',
  'index.js',
);
const contracts = await import(pathToFileURL(dist).href);
const { contract, items } = JSON.parse(readFileSync(0, 'utf8'));
const schema = contracts[contract];
if (schema === undefined) throw new Error(`unknown contract ${contract}`);

const issues = items.map((item) => {
  const result = schema.safeParse(item);
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
});
process.stdout.write(JSON.stringify(issues));
