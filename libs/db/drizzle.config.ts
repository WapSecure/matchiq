import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/schema/tables.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
