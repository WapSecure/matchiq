import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ApiEnv, loadEnv } from '@matchiq/config';
import type { Fixture, MatchEvent, ProblemDetails } from '@matchiq/contracts';
import {
  createTestDatabase,
  testRedisUrl,
  uniqueTestToken,
  type TestDatabase,
} from '@matchiq/db/testing';
import pg from 'pg';
import type { AddressInfo } from 'node:net';
import { AppModule } from '../app/app.module';
import { configureApiApp } from '../app/configure-api-app';

export const OPERATOR_KEY = 'operator-test-key-'.padEnd(48, 'x');
export const AUTH_HEADER = { authorization: `Bearer ${OPERATOR_KEY}` };

export interface TestApp {
  readonly app: NestExpressApplication;
  readonly env: ApiEnv;
  readonly baseUrl: string;
  /** Direct SQL access for asserting on stored rows. */
  readonly sql: pg.Pool;
  close(): Promise<void>;
}

/**
 * Boots the real API on an ephemeral port against a throwaway, migrated
 * database and a unique Redis key prefix, so test files can run in parallel.
 */
export const startTestApp = async (
  overrides: Record<string, string> = {},
): Promise<TestApp> => {
  const database: TestDatabase = await createTestDatabase();
  const env = loadEnv(ApiEnv, {
    APP_VERSION: '1.2.3',
    DATABASE_URL: database.url,
    REDIS_URL: testRedisUrl(),
    REDIS_KEY_PREFIX: `t${uniqueTestToken()}`,
    OPERATOR_API_KEY: OPERATOR_KEY,
    OUTBOX_POLL_INTERVAL_MS: '50',
    SSE_HEARTBEAT_MS: '150',
    RATE_LIMIT_PER_MINUTE: '10000',
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(env)],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApiApp(app, env);
  await app.listen(0, '127.0.0.1');
  const { port } = app.getHttpServer().address() as AddressInfo;
  const sql = new pg.Pool({ connectionString: database.url, max: 2 });
  return {
    app,
    env,
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    sql,
    close: async () => {
      await app.close();
      await sql.end();
      await database.drop();
    },
  };
};

export const countRows = async (
  sql: pg.Pool,
  table: 'match_events' | 'stream_messages' | 'audit_events' | 'fixtures',
): Promise<number> => {
  const result = await sql.query<{ n: number }>(
    `select count(*)::int as n from ${table}`,
  );
  return result.rows[0]?.n ?? 0;
};

/** Test-only typed JSON read; defaults to the problem-details shape. */
export const jsonOf = async <T = ProblemDetails>(res: Response): Promise<T> =>
  (await res.json()) as T;

export const batchOf = (fixtureId: string, events: MatchEvent[]) => ({
  schemaVersion: 1,
  fixtureId,
  events,
});

export const postJson = (
  url: string,
  body: unknown,
  headers: Record<string, string> = AUTH_HEADER,
): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

export const createFixture = async (
  t: TestApp,
  fixture: Fixture,
): Promise<void> => {
  const res = await postJson(`${t.baseUrl}/fixtures`, fixture);
  if (res.status !== 201) throw new Error(`create fixture: ${res.status}`);
};
