import {
  createDatabase,
  findFixturesFolder,
  PostgresTemplateStore,
  QUEUES,
  seedTemplates,
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

jest.setTimeout(60_000);

const TEMPLATE = 'fx_comeback_42';
const ANON = {};

interface Created {
  session: { sessionId: string };
}

const sessionsUrl = (t: TestApp) =>
  `${t.baseUrl}/fixtures/${TEMPLATE}/sessions`;
const replayUrl = (t: TestApp, id: string) =>
  `${t.baseUrl}/fixtures/${id}/replay`;

const setSession = (
  t: TestApp,
  sessionId: string,
  values: { state?: string; ageMs?: number },
) =>
  t.sql.query(
    `update replay_sessions set state = coalesce($2, state),
       updated_at = now() - make_interval(secs => $3::double precision / 1000)
     where fixture_id = $1`,
    [sessionId, values.state ?? null, values.ageMs ?? 0],
  );

const sessionCount = async (t: TestApp): Promise<number> =>
  (
    await t.sql.query<{ n: number }>(
      'select count(*)::int as n from replay_sessions',
    )
  ).rows[0]?.n ?? 0;

describe('Replay capacity and idempotency (integration)', () => {
  let t: TestApp;
  let db: DatabaseHandle;
  let redis: Redis;
  let queue: Queue;

  beforeAll(async () => {
    t = await startTestApp({
      REPLAY_MAX_ACTIVE_SESSIONS: '2',
      REPLAY_IDLE_TIMEOUT_MS: '60000',
      REPLAY_RATE_LIMIT_PER_MINUTE: '1000',
    });
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

  beforeEach(async () => {
    await t.sql.query(
      `update replay_sessions set state = 'COMPLETED', updated_at = now()`,
    );
    await queue.obliterate({ force: true });
  });

  const create = (headers: Record<string, string> = ANON, speed = 30) =>
    postJson(sessionsUrl(t), { speed }, headers);

  it('answers 503 replay-capacity with Retry-After once every slot is taken, creating nothing', async () => {
    const first = await jsonOf<Created>(await create());
    const second = await create();
    expect(second.status).toBe(201);
    await setSession(t, first.session.sessionId, { state: 'PLAYING' });
    const before = await sessionCount(t);

    const full = await create();
    expect(full.status).toBe(503);
    expect(full.headers.get('retry-after')).toBe('30');
    expect(await jsonOf(full)).toMatchObject({
      type: 'urn:matchiq:problem:replay-capacity',
      status: 503,
      detail: expect.stringContaining('2 of 2'),
    });
    expect(await sessionCount(t)).toBe(before);
    expect(await queue.getWaitingCount()).toBe(2);
  });

  it('frees the slot when a session pauses, completes or goes untouched past the idle timeout', async () => {
    const a = await jsonOf<Created>(await create());
    const b = await jsonOf<Created>(await create());
    expect((await create()).status).toBe(503);

    await setSession(t, a.session.sessionId, { state: 'PAUSED' });
    const c = await create();
    expect(c.status).toBe(201);
    expect((await create()).status).toBe(503);

    await setSession(t, b.session.sessionId, { ageMs: 120_000 });
    expect((await create()).status).toBe(201);
    expect((await create()).status).toBe(503);

    const stalePlaying = (await jsonOf<Created>(c)).session.sessionId;
    await setSession(t, stalePlaying, { state: 'PLAYING', ageMs: 120_000 });
    expect((await create()).status).toBe(201);
  });

  it('refuses resume at capacity but never counts a session against itself', async () => {
    const paused = await jsonOf<Created>(await create());
    const idle = await jsonOf<Created>(await create());
    await setSession(t, paused.session.sessionId, { state: 'PAUSED' });
    const third = await jsonOf<Created>(await create());
    await setSession(t, third.session.sessionId, { state: 'PLAYING' });

    const resume = await postJson(
      replayUrl(t, paused.session.sessionId),
      { action: 'resume' },
      ANON,
    );
    expect(resume.status).toBe(503);
    expect(resume.headers.get('retry-after')).toBe('30');

    const start = await postJson(
      replayUrl(t, idle.session.sessionId),
      { action: 'start', speed: 30 },
      ANON,
    );
    expect(start.status).toBe(202);

    const pause = await postJson(
      replayUrl(t, third.session.sessionId),
      { action: 'pause' },
      ANON,
    );
    expect(pause.status).toBe(202);
  });

  it('replays a session create for a repeated Idempotency-Key and queues one start', async () => {
    const headers = { 'idempotency-key': 'create-once-1' };
    const first = await create(headers);
    const again = await create(headers);
    expect(first.status).toBe(201);
    expect(again.status).toBe(201);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await jsonOf(again)).toEqual(await jsonOf(first));
    expect(await queue.getWaitingCount()).toBe(1);

    const reused = await create(headers, 5);
    expect(reused.status).toBe(422);
    expect((await jsonOf(reused)).type).toBe(
      'urn:matchiq:problem:idempotency-key-reused',
    );
  });

  it('replays a command for a repeated Idempotency-Key and rejects reuse on another command', async () => {
    const { session } = await jsonOf<Created>(await create());
    await queue.obliterate({ force: true });
    const url = replayUrl(t, session.sessionId);
    const headers = { 'idempotency-key': 'speed-once-1' };

    const first = await postJson(
      url,
      { action: 'setSpeed', speed: 5 },
      headers,
    );
    const again = await postJson(
      url,
      { action: 'setSpeed', speed: 5 },
      headers,
    );
    expect(first.status).toBe(202);
    expect(again.status).toBe(202);
    expect(again.headers.get('idempotent-replayed')).toBe('true');
    expect(await jsonOf(again)).toEqual(await jsonOf(first));
    expect(await queue.getWaitingCount()).toBe(1);

    const other = await postJson(
      url,
      { action: 'setSpeed', speed: 20 },
      headers,
    );
    expect(other.status).toBe(422);
  });

  it('does not store the key when the command fails, so a retry runs it', async () => {
    const { session } = await jsonOf<Created>(await create());
    const url = replayUrl(t, session.sessionId);
    const headers = { 'idempotency-key': 'pause-retry-1' };
    expect((await postJson(url, { action: 'pause' }, headers)).status).toBe(
      409,
    );
    await setSession(t, session.sessionId, { state: 'PLAYING' });
    expect((await postJson(url, { action: 'pause' }, headers)).status).toBe(
      202,
    );
  });
});
