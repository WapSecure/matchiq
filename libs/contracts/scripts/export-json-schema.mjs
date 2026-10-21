import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CROSS_LANGUAGE_CONTRACTS,
  toContractJsonSchema,
} from '../dist/index.js';

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'generated',
  'json-schema',
);

await mkdir(outDir, { recursive: true });
for (const file of await readdir(outDir)) {
  if (file.endsWith('.json')) await rm(join(outDir, file));
}

const names = Object.keys(CROSS_LANGUAGE_CONTRACTS).sort();
for (const name of names) {
  const schema = { title: name, ...toContractJsonSchema(name) };
  await writeFile(
    join(outDir, `${name}.json`),
    `${JSON.stringify(schema, null, 2)}\n`,
  );
}

console.log(`Exported ${names.length} JSON Schemas to ${outDir}`);
