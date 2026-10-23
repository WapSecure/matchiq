import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON_FILE_NAME, serializeLexicon } from '../dist/index.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'generated');
const outFile = join(outDir, LEXICON_FILE_NAME);

await mkdir(outDir, { recursive: true });
await writeFile(outFile, serializeLexicon());

console.log(`Exported the narrative lexicon to ${outFile}`);
