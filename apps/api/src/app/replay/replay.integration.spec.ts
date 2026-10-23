import {
  ReplayCommandJob,
  QUEUES,
  findFixturesFolder,
  seedTemplates,
  createDatabase,
  PostgresTemplateStore,
  type DatabaseHandle,
} from '@matchiq/db';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import {
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../../test/test-app';

jest.setTimeout(30_000);

const TEMPLATE = 'fx_comeback_42';
const ANON = {};

interface SessionBody {
  fixture: { fixtureId: string; status: string };
  session: { sessionId: string; templateId: string; status: { state: string } };
}

describe('Replay sessions API (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let redis: Redis;
  let queue: Queue;

  beforeAll(async () => {
    t = await startTestApp({ REPLAY_RATE_LIMIT_PER_MINUTE: '12' });
    db = createDatabase({ url: t.env.DATABASE_URL, poolMax: 1 });
    await seedTemplates(
      new PostgresTemplateStore(db.db),
      t.env.DEMO_ORG_ID,
      findFixturesFolder(),
    );
    redis = new Redis(t.env.REDIS_URL, { maxRetriesPerRequest: null });
    queue = new Queue(QUEUES.replayCommands, {
      connection: redis,
      prefix: t.env.REDIS_KEY_PREFIX,
    });
  });

  afterAll(async () => {
    await queue.close();
    redis.disconnect();
    await db.close();
    await t.close();
  });

  const start = async (): Promise<SessionBody> => {
    const res = await postJson(
      `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`,
      { speed: 30 },
      ANON,
    );
    expect(res.status).toBe(201);
    return jsonOf<SessionBody>(res);
  };

  it('lists the seeded templates for the lobby', async () => {
    const res = await fetch(`${t.baseUrl}/fixture-templates`);
    expect(res.status).toBe(200);
    const body = await jsonOf<{
      items: { templateId: string; finalScore: unknown; eventCount: number }[];
    }>(res);
    expect(body.items).toHaveLength(6);
    expect(body.items.find((i) => i.templateId === TEMPLATE)).toMatchObject({
      finalScore: { home: 3, away: 2 },
      eventCount: 1470,
    });
  });

  it('creates numbered sessions anonymously and queues their start command', async () => {
    const first = await start();
    const second = await start();
    expect(first.fixture).toMatchObject({
      fixtureId: `${TEMPLATE}_s1`,
      status: 'LIVE',
    });
    expect(second.session).toMatchObject({
      sessionId: `${TEMPLATE}_s2`,
      templateId: TEMPLATE,
      status: { state: 'IDLE' },
    });

    const jobs = await queue.getJobs(['waiting']);
    const commands = jobs.map((j) => ReplayCommandJob.parse(j.data));
    expect(commands).toEqual(
      expect.arrayContaining([
        {
          orgId: 'org_demo',
          fixtureId: `${TEMPLATE}_s1`,
          command: { action: 'start', speed: 30 },
        },
      ]),
    );

    const listed = await jsonOf<{ items: { sessionId: string }[] }>(
      await fetch(`${t.baseUrl}/replay-sessions`),
    );
    expect(listed.items.map((s) => s.sessionId)).toEqual([
      `${TEMPLATE}_s2`,
      `${TEMPLATE}_s1`,
    ]);

    const stream = await fetch(`${t.baseUrl}/fixtures/${TEMPLATE}_s1/stream`, {
      signal: AbortSignal.timeout(500),
    }).catch(() => null);
    expect(stream?.status).toBe(200);
  });

  it('answers 404 for unknown templates and sessions', async () => {
    const missing = await postJson(
      `${t.baseUrl}/fixtures/fx_nope/sessions`,
      { speed: 30 },
      ANON,
    );
    expect(missing.status).toBe(404);
    expect((await jsonOf(missing)).type).toBe(
      'urn:matchiq:problem:fixture-template-not-found',
    );
    const status = await fetch(`${t.baseUrl}/fixtures/fx_nope_s1/replay`);
    expect(status.status).toBe(404);
    expect((await jsonOf(status)).type).toBe(
      'urn:matchiq:problem:replay-session-not-found',
    );
  });

  it('validates commands and answers 409 for invalid transitions', async () => {
    const url = `${t.baseUrl}/fixtures/${TEMPLATE}_s1/replay`;
    const status = await jsonOf<{ state: string; appliedSequence: number }>(
      await fetch(url),
    );
    expect(status).toMatchObject({ state: 'IDLE', appliedSequence: -1 });

    const pause = await postJson(url, { action: 'pause' }, ANON);
    expect(pause.status).toBe(409);
    expect(await jsonOf(pause)).toMatchObject({
      type: 'urn:matchiq:problem:replay-state-conflict',
      detail: 'cannot pause while IDLE',
    });

    const seek = await postJson(url, { action: 'seek', sequence: 5 }, ANON);
    expect(seek.status).toBe(409);

    const invalid = await postJson(url, { action: 'rewind' }, ANON);
    expect(invalid.status).toBe(422);

    const speed = await postJson(url, { action: 'setSpeed', speed: 5 }, ANON);
    expect(speed.status).toBe(202);
    expect(await jsonOf(speed)).toMatchObject({ state: 'IDLE', speed: 5 });
  });

  it('rate limits replay controls per client with a 429 problem while reads stay open', async () => {
    const url = `${t.baseUrl}/fixtures/${TEMPLATE}_s2/replay`;
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await postJson(url, { action: 'pause' }, ANON)).status);
    }
    expect(statuses).toContain(429);
    const limited = await postJson(url, { action: 'pause' }, ANON);
    expect(limited.status).toBe(429);
    expect((await jsonOf(limited)).type).toBe(
      'urn:matchiq:problem:rate-limited',
    );
    expect((await fetch(url)).status).toBe(200);
  });
});
