import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { CliIo } from './commands.js';

/** Relative paths resolve against the directory the user invoked pnpm from. */
const resolvePath = (path: string): string =>
  resolve(process.env['INIT_CWD'] ?? process.cwd(), path);

export const nodeIo: CliIo = {
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
  readFile: (path) => readFile(resolvePath(path), 'utf8'),
  writeFile: async (path, content) => {
    const target = resolvePath(path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  },
};
