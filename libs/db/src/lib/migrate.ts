import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './client.js';
import { DB_PACKAGE_PATH, MIGRATIONS_DIRECTORY } from './constants.js';

/** Applies every pending numbered migration in order; already-applied ones are skipped. */
export const runMigrations = async (
  url: string,
  migrationsFolder: string,
): Promise<void> => {
  const handle = createDatabase({ url, poolMax: 1 });
  try {
    await migrate(handle.db, { migrationsFolder });
  } finally {
    await handle.close();
  }
};

/**
 * Finds `libs/db/migrations` from any directory inside the workspace, for
 * tools and tests that run from a project root rather than from this package.
 */
export const findMigrationsFolder = (start: string = process.cwd()): string => {
  let dir = start;
  for (;;) {
    const candidate = join(dir, ...DB_PACKAGE_PATH, MIGRATIONS_DIRECTORY);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('Migrations folder not found');
    dir = parent;
  }
};
