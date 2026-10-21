import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Pool } from 'pg';
import * as intelligence from './schema/intelligence-tables.js';
import * as ledger from './schema/tables.js';

const schema = { ...ledger, ...intelligence };

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Executor = Database | Transaction;

export interface DatabaseHandle {
  readonly db: Database;
  readonly pool: Pool;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  readonly url: string;
  readonly poolMax?: number;
  readonly applicationName?: string;
  /** Errors from idle pooled connections; unhandled they would crash the process. */
  readonly onIdleError?: (error: Error) => void;
}

export const createDatabase = ({
  url,
  poolMax,
  applicationName,
  onIdleError,
}: DatabaseOptions): DatabaseHandle => {
  const pool = new pg.Pool({
    connectionString: url,
    max: poolMax,
    application_name: applicationName,
  });
  pool.on('error', (error) => onIdleError?.(error));
  const db = drizzle({ client: pool, schema });
  return { db, pool, close: () => pool.end() };
};
