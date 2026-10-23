import { hashEvents } from '@matchiq/synthetic-data';
import { Redis } from 'ioredis';
import {
  BullMqReplayCommandBus,
  findFixturesFolder,
  PostgresEventReader,
  PostgresTemplateStore,
  seedTemplates,
} from '@matchiq/db';
import { loadGolden } from '../../test/golden';
import {
  countOf,
  ORG,
  readStream,
  replayToEnd,
  startTestWorker,
  streamHash,
  type TestWorker,
} from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';

describe('replay sessions with AI disabled (integration)', () => {
  let t: TestWorker;

  beforeAll(async () => {
    t = await startTestWorker();
  });

  afterAll(() => t.close());

  it('seeds the golden templates idempotently', async () => {
    const again = await seedTemplates(
      new PostgresTemplateStore(t.db.db),
      ORG,
      findFixturesFolder(),
    );
    expect(again.map((r) => r.outcome)).toEqual(Array(6).fill('unchanged'));
    const templates = await new PostgresTemplateStore(t.db.db).list(ORG);
    expect(templates.map((x) => x.templateId)).toContain(TEMPLATE);
  });

  it('replays comeback into its own session ledger, snapshots, insights, overlays and recap', async () => {
    const key = await replayToEnd(t, TEMPLATE);
    expect(key.fixtureId).toBe(`${TEMPLATE}_s1`);
    const golden = await loadGolden('comeback');

    const ledger = await new PostgresEventReader(t.db.db).listAfter(
      key,
      -1,
      5_000,
    );
    const asTemplate = ledger.map((e) => ({ ...e, fixtureId: TEMPLATE }));
    expect(hashEvents(asTemplate)).toBe(golden.manifest.eventsHash);

    const state = await t.reader.latestSnapshot(key);
    expect(state).toMatchObject({
      phase: 'COMPLETED',
      score: { home: 3, away: 2 },
    });

    const insights = await t.reader.insights(key);
    expect(insights.filter((i) => i.kind === 'GOAL')).toHaveLength(5);
    expect(insights.every((i) => i.status === 'FALLBACK')).toBe(true);

    const narratives = await t.reader.narratives(key, {});
    expect(narratives).toHaveLength(insights.length * 12);
    expect(narratives.every((n) => n.source === 'TEMPLATE')).toBe(true);
    const french = await t.reader.narratives(key, {
      persona: 'CASUAL',
      locale: 'fr-FR',
    });
    expect(french).toHaveLength(insights.length);

    const stream = await readStream(t, key);
    expect(countOf(stream, 'match.event')).toBe(golden.events.length);
    expect(countOf(stream, 'insight.detected')).toBe(insights.length);
    const published = countOf(stream, 'overlay.publish');
    expect(published).toBeGreaterThan(0);
    expect(countOf(stream, 'overlay.retract')).toBe(published);
    const overlays = await t.reader.overlays(key);
    expect(overlays.length).toBe(published);
    expect(
      overlays.every((o) => o.status === 'EXPIRED' || o.status === 'RETRACTED'),
    ).toBe(true);
    expect(
      stream
        .filter((m) => m.type === 'replay.status')
        .map((m) => m.payload.state),
    ).toEqual(['IDLE', 'PLAYING', 'COMPLETED']);

    const recap = await t.reader.recap(key);
    expect(recap?.finalSnapshot.score).toEqual({ home: 3, away: 2 });
    expect(recap?.keyMoments.filter((m) => m.kind === 'GOAL')).toHaveLength(5);
    expect(recap?.keyMoments[0]?.narratives).toHaveLength(12);

    const traces = await t.reader.traces(key);
    expect(traces[0]).toMatchObject({
      publication: 'TEMPLATE',
      runs: [expect.objectContaining({ provider: 'template' })],
    });
  });

  it('emits an identical stream when the same session replays in a fresh database', async () => {
    const first = await readStream(t, {
      orgId: ORG,
      fixtureId: `${TEMPLATE}_s1`,
    });
    const other = await startTestWorker();
    try {
      const key = await replayToEnd(other, TEMPLATE, 30);
      const second = await readStream(other, key);
      expect(second).toHaveLength(first.length);
      expect(streamHash(second)).toBe(streamHash(first));
      expect(await other.reader.recap(key)).toEqual(await t.reader.recap(key));
    } finally {
      await other.close();
    }
  });

  it('emits the same snapshots, insights and cues at a different replay speed', async () => {
    const withoutStatus = (messages: Awaited<ReturnType<typeof readStream>>) =>
      messages.filter((m) => m.type !== 'replay.status');
    const first = await readStream(t, {
      orgId: ORG,
      fixtureId: `${TEMPLATE}_s1`,
    });
    const slow = await startTestWorker();
    try {
      const key = await replayToEnd(slow, TEMPLATE, 5);
      const second = await readStream(slow, key);
      expect(streamHash(withoutStatus(second))).toBe(
        streamHash(withoutStatus(first)),
      );
    } finally {
      await slow.close();
    }
  });

  it('pauses, fast-forwards a seek and resumes in order', async () => {
    const created = await t.store.create({
      orgId: ORG,
      templateId: TEMPLATE,
      speed: 30,
    });
    if (created === null) throw new Error('no session');
    const key = { orgId: ORG, fixtureId: created.fixture.fixtureId };
    await t.sessions.handle({
      ...key,
      command: { action: 'start', speed: 30 },
    });
    t.scheduler.advance(20_000);
    await t.sessions.handle({ ...key, command: { action: 'pause' } });
    await t.sessions.handle({
      ...key,
      command: { action: 'seek', sequence: 1_000 },
    });
    await t.sessions.whenIdle(key.fixtureId);
    const paused = await t.store.get(key);
    expect(paused?.status).toMatchObject({
      state: 'PAUSED',
      appliedSequence: 999,
    });
    await t.sessions.handle({ ...key, command: { action: 'resume' } });
    t.scheduler.runAll();
    await t.sessions.whenIdle(key.fixtureId);
    const ledger = await new PostgresEventReader(t.db.db).listAfter(
      key,
      -1,
      5_000,
    );
    expect(ledger.map((e) => e.sequence)).toEqual(ledger.map((_, i) => i));
    expect((await t.store.get(key))?.status.state).toBe('COMPLETED');
  });

  it('resumes a session after a worker restart at its persisted speed', async () => {
    const created = await t.store.create({
      orgId: ORG,
      templateId: TEMPLATE,
      speed: 20,
    });
    if (created === null) throw new Error('no session');
    const key = { orgId: ORG, fixtureId: created.fixture.fixtureId };
    await t.sessions.handle({
      ...key,
      command: { action: 'start', speed: 20 },
    });
    t.scheduler.advance(20_000);
    await t.sessions.whenIdle(key.fixtureId);
    const before = await t.store.get(key);
    expect(before?.status).toMatchObject({ state: 'PLAYING', speed: 20 });

    const restarted = await startTestWorker({ database: t.database });
    try {
      await restarted.sessions.whenIdle(key.fixtureId);
      const after = await restarted.store.get(key);
      expect(after?.status).toMatchObject({ state: 'PLAYING', speed: 20 });
      expect(after?.status.appliedSequence).toBeGreaterThanOrEqual(
        before?.status.appliedSequence ?? 0,
      );
    } finally {
      await restarted.close({ keepDatabase: true });
    }
  });

  it('accepts commands through the BullMQ command queue', async () => {
    const consumer = await startTestWorker({ consumeQueues: true });
    const connection = new Redis(consumer.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    const bus = new BullMqReplayCommandBus({
      connection,
      prefix: consumer.env.REDIS_KEY_PREFIX,
    });
    try {
      const created = await consumer.store.create({
        orgId: ORG,
        templateId: 'fx_low-event_42',
        speed: 30,
      });
      if (created === null) throw new Error('no session');
      const key = { orgId: ORG, fixtureId: created.fixture.fixtureId };
      await bus.send({ ...key, command: { action: 'start', speed: 30 } });
      for (
        let i = 0;
        i < 100 && (await consumer.store.get(key))?.status.state !== 'PLAYING';
        i += 1
      ) {
        await new Promise((r) => setTimeout(r, 50));
      }
      expect((await consumer.store.get(key))?.status.state).toBe('PLAYING');
    } finally {
      await bus.close();
      connection.disconnect();
      await consumer.close();
    }
  });
});
