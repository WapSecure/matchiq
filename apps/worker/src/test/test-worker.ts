import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WorkerEnv, loadEnv } from '@matchiq/config';
import {
  canonicalJson,
  createDatabase,
  findFixturesFolder,
  PostgresIntelligenceReader,
  PostgresSessionStore,
  PostgresStreamHistory,
  PostgresTemplateStore,
  seedTemplates,
  sha256Hex,
  type DatabaseHandle,
  type FixtureKey,
} from '@matchiq/db';
import {
  createTestDatabase,
  testRedisUrl,
  uniqueTestToken,
  type TestDatabase,
} from '@matchiq/db/testing';
import { ManualScheduler } from '@matchiq/replay';
import type { ReplaySpeed, StreamMessage } from '@matchiq/contracts';
import type { AgentsClient } from '../app/agents/agents-client';
import { InsightPipelineService } from '../app/agents/insight-pipeline.service';
import { AppModule } from '../app/app.module';
import { InsightRecoveryService } from '../app/maintenance/insight-recovery.service';
import { RetentionService } from '../app/maintenance/retention.service';
import { SessionManager } from '../app/replay/session-manager.service';

export const AGENTS_TOKEN = 'agents-test-token-'.padEnd(48, 'x');
export const ORG = 'org_demo';

export interface TestWorker {
  readonly app: INestApplication;
  readonly env: WorkerEnv;
  readonly scheduler: ManualScheduler;
  readonly sessions: SessionManager;
  readonly pipeline: InsightPipelineService;
  readonly recovery: InsightRecoveryService;
  readonly retention: RetentionService;
  readonly db: DatabaseHandle;
  readonly store: PostgresSessionStore;
  readonly reader: PostgresIntelligenceReader;
  readonly history: PostgresStreamHistory;
  readonly database: TestDatabase;
  close(options?: { keepDatabase?: boolean }): Promise<void>;
}

export interface TestWorkerOptions {
  readonly env?: Record<string, string>;
  readonly agentsClient?: AgentsClient;
  readonly consumeQueues?: boolean;
  readonly database?: TestDatabase;
}

/**
 * Boots the worker module against a throwaway migrated database with the
 * golden templates seeded, a virtual-time scheduler and (by default) no
 * queue consumers, so tests drive sessions directly.
 */
export const startTestWorker = async (
  options: TestWorkerOptions = {},
): Promise<TestWorker> => {
  const database = options.database ?? (await createTestDatabase());
  const env = loadEnv(WorkerEnv, {
    DATABASE_URL: database.url,
    REDIS_URL: testRedisUrl(),
    REDIS_KEY_PREFIX: `t${uniqueTestToken()}`,
    AGENTS_SERVICE_TOKEN: AGENTS_TOKEN,
    OUTBOX_POLL_INTERVAL_MS: '50',
    ...options.env,
  });
  const db = createDatabase({ url: database.url, poolMax: 2 });
  await seedTemplates(
    new PostgresTemplateStore(db.db),
    ORG,
    findFixturesFolder(),
  );
  const scheduler = new ManualScheduler();
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot(env, {
        scheduler,
        consumeQueues: options.consumeQueues ?? false,
        ...(options.agentsClient ? { agentsClient: options.agentsClient } : {}),
      }),
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return {
    app,
    env,
    scheduler,
    sessions: app.get(SessionManager),
    pipeline: app.get(InsightPipelineService),
    recovery: app.get(InsightRecoveryService),
    retention: app.get(RetentionService),
    db,
    store: new PostgresSessionStore(db.db),
    reader: new PostgresIntelligenceReader(db.db),
    history: new PostgresStreamHistory(db.db),
    database,
    close: async (closeOptions = {}) => {
      await app.close();
      await db.close();
      if (!closeOptions.keepDatabase) await database.drop();
    },
  };
};

/** Creates a session and replays it to the end in virtual time. */
export const replayToEnd = async (
  t: TestWorker,
  templateId: string,
  speed: ReplaySpeed = 30,
): Promise<FixtureKey> => {
  const created = await t.store.create({ orgId: ORG, templateId, speed });
  if (created === null) throw new Error(`template ${templateId} missing`);
  const key = { orgId: ORG, fixtureId: created.fixture.fixtureId };
  await t.sessions.handle({ ...key, command: { action: 'start', speed } });
  t.scheduler.runAll();
  await t.sessions.whenIdle(key.fixtureId);
  return key;
};

export const readStream = async (
  t: TestWorker,
  key: FixtureKey,
): Promise<StreamMessage[]> => {
  const all: StreamMessage[] = [];
  for (;;) {
    const page = await t.history.read(key, {
      after: all.at(-1)?.streamSequence ?? 0,
      limit: 1_000,
    });
    if (page.length === 0) return all;
    all.push(...page);
  }
};

const WALL_CLOCK_KEYS = new Set(['emittedAt', 'createdAt', 'startedAt']);

/** Hash of the stream with wall-clock fields removed: equal for deterministic replays. */
export const streamHash = (messages: readonly StreamMessage[]): string =>
  sha256Hex(
    JSON.parse(canonicalJson(messages), (k: string, v: unknown) =>
      WALL_CLOCK_KEYS.has(k) ? undefined : v,
    ),
  );

export const countOf = (
  messages: readonly StreamMessage[],
  type: StreamMessage['type'],
): number => messages.filter((m) => m.type === type).length;
