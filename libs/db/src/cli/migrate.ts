import { fileURLToPath } from 'node:url';
import { DatabaseEnv, loadEnv } from '@matchiq/config';
import { runMigrations } from '../lib/migrate.js';

const MIGRATIONS_URL = new URL('../../migrations', import.meta.url);

const main = async (): Promise<void> => {
  const { DATABASE_URL } = loadEnv(DatabaseEnv);
  await runMigrations(DATABASE_URL, fileURLToPath(MIGRATIONS_URL));
  console.warn('Migrations applied');
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
