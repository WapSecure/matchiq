import { randomBytes } from 'node:crypto';
import pg from 'pg';
import {
  DEFAULT_TEST_DATABASE_URL,
  DEFAULT_TEST_REDIS_URL,
  TEST_DATABASE_PREFIX,
} from '../lib/constants.js';
import { findMigrationsFolder, runMigrations } from '../lib/migrate.js';

export interface TestDatabase {
  readonly url: string;
  drop(): Promise<void>;
}

/** The server used by integration tests: CI service containers or local compose. */
export const testDatabaseServerUrl = (): string =>
  process.env['TEST_DATABASE_URL'] ??
  process.env['DATABASE_URL'] ??
  DEFAULT_TEST_DATABASE_URL;

export const testRedisUrl = (): string =>
  process.env['TEST_REDIS_URL'] ??
  process.env['REDIS_URL'] ??
  DEFAULT_TEST_REDIS_URL;

/** A unique, lowercase token for namespacing test databases and channels. */
export const uniqueTestToken = (): string => randomBytes(6).toString('hex');

const withAdmin = async (serverUrl: string, sql: string): Promise<void> => {
  const client = new pg.Client({ connectionString: serverUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
};

/**
 * Creates a throwaway database with every migration applied, so parallel test
 * files never share rows. `drop()` removes it even with open connections.
 */
export const createTestDatabase = async (): Promise<TestDatabase> => {
  const serverUrl = testDatabaseServerUrl();
  const name = `${TEST_DATABASE_PREFIX}${uniqueTestToken()}`;
  await withAdmin(serverUrl, `CREATE DATABASE ${name}`);
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  await runMigrations(url.toString(), findMigrationsFolder());
  return {
    url: url.toString(),
    drop: () =>
      withAdmin(serverUrl, `DROP DATABASE IF EXISTS ${name} WITH (FORCE)`),
  };
};
