import { QUEUES, type FixtureKey } from '@matchiq/db';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import {
  fakePipelineResult,
  startFakeAgents,
  type FakeAgentsServer,
} from '../../test/fake-agents';
import { loadGolden } from '../../test/golden';
import {
  replayToEnd,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';
import { RECOVERY_REASONS } from './maintenance.constants';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';

describe('boot recovery of PENDING insights (integration)', () => {
  let agents: FakeAgentsServer;
  let t: TestWorker;
  let key: FixtureKey;
  let redis: Redis;
  let queue: Queue;

  const pendingIds = async (): Promise<string[]> =>
    (
      await t.db.pool.query<{ insight_id: string }>(
        `select insight_id from insights where publication = 'PENDING' order by insight_id`,
      )
    ).rows.map((r) => r.insight_id);

  const reboot = (env: Record<string, string>) =>
    startTestWorker({
      database: t.database,
      env: {
        REDIS_KEY_PREFIX: t.env.REDIS_KEY_PREFIX,
        AGENTS_SERVICE_URL: agents.url,
        RETENTION_ENABLED: 'false',
        ...env,
      },
    });

  beforeAll(async () => {
    const golden = await loadGolden('comeback');
    agents = await startFakeAgents((r) => ({
      status: 200,
      body: fakePipelineResult(r, {
        ...golden.fixture,
        fixtureId: r.packet.fixtureId,
      }),
    }));
    t = await startTestWorker({
      env: {
        AI_ENABLED: 'true',
        AGENTS_SERVICE_URL: agents.url,
        RETENTION_ENABLED: 'false',
      },
    });
    key = await replayToEnd(t, TEMPLATE);
    redis = new Redis(t.env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue(QUEUES.insightPipeline, {
      connection: redis,
      prefix: t.env.REDIS_KEY_PREFIX,
    });
  });

  afterAll(async () => {
    await queue.close();
    redis.disconnect();
    await t.close();
    await agents.close();
  });

  it('re-enqueues insights whose jobs were lost, once, while within the agents deadline', async () => {
    const pending = await pendingIds();
    expect(pending.length).toBeGreaterThan(0);
    await queue.obliterate({ force: true });

    const restarted = await reboot({ AI_ENABLED: 'true' });
    try {
      expect(await queue.getWaitingCount()).toBe(pending.length);
      expect(await restarted.recovery.recover()).toEqual({
        requeued: pending.length,
        fallbacks: 0,
      });
      expect(await queue.getWaitingCount()).toBe(pending.length);
      expect(await pendingIds()).toEqual(pending);
    } finally {
      await restarted.close({ keepDatabase: true });
    }
  });

  it('publishes templates for insights past the deadline and rebuilds the recap', async () => {
    const pending = await pendingIds();
    await t.db.pool.query(
      `update insights set created_at = now() - interval '1 hour'`,
    );
    const restarted = await reboot({ AI_ENABLED: 'true' });
    try {
      expect(await pendingIds()).toEqual([]);
      const traces = await restarted.reader.traces(key);
      expect(traces.map((tr) => tr.insightId).sort()).toEqual(pending);
      expect(
        traces.every(
          (tr) =>
            tr.publication === 'TEMPLATE' &&
            tr.fallbackReason === RECOVERY_REASONS.expired,
        ),
      ).toBe(true);
      const narratives = await restarted.reader.narratives(key, {});
      expect(narratives).toHaveLength(pending.length * 12);
      const recap = await restarted.reader.recap(key);
      expect(recap?.keyMoments.every((m) => m.narratives.length === 12)).toBe(
        true,
      );
      expect(await restarted.recovery.recover()).toEqual({
        requeued: 0,
        fallbacks: 0,
      });
    } finally {
      await restarted.close({ keepDatabase: true });
    }
  });

  it('rebuilds the recap for a late agent publication after the completed session left memory', async () => {
    const session = await replayToEnd(t, TEMPLATE);
    const [first] = await t.reader.insights(session);
    if (!first) throw new Error('no insight');
    t.sessions.release(session.fixtureId);
    expect(t.sessions.isLoaded(session.fixtureId)).toBe(false);

    const outcome = await t.pipeline.process(
      { ...session, insightId: first.insightId, revision: 1 },
      { attemptsMade: 0, maxAttempts: 3 },
    );
    expect(outcome).toBe('written');
    const moment = (await t.reader.recap(session))?.keyMoments.find(
      (m) => m.insightId === first.insightId,
    );
    expect(moment?.narratives).toHaveLength(12);
    expect(moment?.narratives.every((n) => n.source === 'AGENT')).toBe(true);
  });

  it('publishes templates straight away when the worker restarts with AI disabled', async () => {
    const other = await startTestWorker({
      env: {
        AI_ENABLED: 'true',
        AGENTS_SERVICE_URL: agents.url,
        RETENTION_ENABLED: 'false',
      },
    });
    try {
      const session = await replayToEnd(other, TEMPLATE);
      const restarted = await startTestWorker({
        database: other.database,
        env: { AI_ENABLED: 'false', RETENTION_ENABLED: 'false' },
      });
      try {
        const traces = await restarted.reader.traces(session);
        expect(traces.length).toBeGreaterThan(0);
        expect(
          traces.every(
            (tr) => tr.fallbackReason === RECOVERY_REASONS.aiDisabled,
          ),
        ).toBe(true);
      } finally {
        await restarted.close({ keepDatabase: true });
      }
    } finally {
      await other.close();
    }
  });
});
