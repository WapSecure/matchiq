import type { Fixture } from '@matchiq/contracts';
import type { FixtureKey } from '@matchiq/db';
import {
  fakePipelineResult,
  startFakeAgents,
  type FakeAgentsServer,
} from '../../test/fake-agents';
import { loadGolden } from '../../test/golden';
import {
  countOf,
  readStream,
  replayToEnd,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';

describe('agents pipeline with AI enabled (integration)', () => {
  let agents: FakeAgentsServer;
  let t: TestWorker;
  let fixture: Fixture;
  let key: FixtureKey;
  const attempt = (attemptsMade: number) => ({ attemptsMade, maxAttempts: 3 });

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
        AGENT_TIMEOUT_MS: '500',
      },
    });
    key = await replayToEnd(t, TEMPLATE);
    const stored = await t.db.db.query.fixtures.findFirst();
    if (!stored) throw new Error('no fixture');
    fixture = stored.payload;
  });

  afterAll(async () => {
    await t.close();
    await agents.close();
  });

  const job = (insightId: string) => ({ ...key, insightId, revision: 1 });

  it('replays without waiting for the model: insights stay pending, overlays still publish', async () => {
    const insights = await t.reader.insights(key);
    expect(insights.length).toBeGreaterThan(0);
    expect(await t.reader.narratives(key, {})).toEqual([]);
    const stream = await readStream(t, key);
    expect(countOf(stream, 'overlay.publish')).toBeGreaterThan(0);
    expect(fixture.fixtureId).toBe(key.fixtureId);
  });

  it('publishes agent narratives in three personas and four locales', async () => {
    const [first] = await t.reader.insights(key);
    if (!first) throw new Error('no insight');
    expect(await t.pipeline.process(job(first.insightId), attempt(0))).toBe(
      'written',
    );
    const narratives = (await t.reader.narratives(key, {})).filter(
      (n) => n.insightId === first.insightId,
    );
    expect(narratives).toHaveLength(12);
    expect(new Set(narratives.map((n) => n.source))).toEqual(
      new Set(['AGENT']),
    );
    expect(
      new Set(narratives.map((n) => `${n.persona}/${n.locale}`)).size,
    ).toBe(12);
    const trace = (await t.reader.traces(key)).find(
      (x) => x.insightId === first.insightId,
    );
    expect(trace).toMatchObject({ status: 'PUBLISHED', publication: 'AGENT' });
    expect(trace?.runs[0]?.provider).toBe('mock');
    expect(agents.requests.at(-1)?.personas).toEqual([
      'CASUAL',
      'ANALYST',
      'BROADCAST',
    ]);
  });

  it('does not publish twice when a job is delivered again', async () => {
    const [first] = await t.reader.insights(key);
    if (!first) throw new Error('no insight');
    expect(await t.pipeline.process(job(first.insightId), attempt(0))).toBe(
      'skipped',
    );
    const narratives = await t.reader.narratives(key, {});
    expect(
      narratives.filter((n) => n.insightId === first.insightId),
    ).toHaveLength(12);
  });

  it('races two deliveries of one job into a single publication', async () => {
    const insight = (await t.reader.insights(key))[1];
    if (!insight) throw new Error('no insight');
    const outcomes = await Promise.all([
      t.pipeline.process(job(insight.insightId), attempt(0)),
      t.pipeline.process(job(insight.insightId), attempt(0)),
    ]);
    expect(outcomes).toContain('written');
    const stream = await readStream(t, key);
    const ready = stream.filter(
      (m) =>
        m.type === 'narrative.ready' &&
        m.payload.insightId === insight.insightId,
    );
    expect(ready).toHaveLength(12);
  });

  it('rejects a draft that cites an unsupported number and serves the template for that variant', async () => {
    const insight = (await t.reader.insights(key))[2];
    if (!insight) throw new Error('no insight');
    agents.behave((r) => {
      const result = fakePipelineResult(r, fixture);
      const [bad, ...rest] = result.narratives;
      if (!bad) throw new Error('no draft');
      const tampered = {
        ...bad,
        citedValues: bad.citedValues.map((c) => ({ ...c, value: c.value + 7 })),
      };
      return {
        status: 200,
        body: { ...result, narratives: [tampered, ...rest] },
      };
    });
    await t.pipeline.process(job(insight.insightId), attempt(0));
    const trace = (await t.reader.traces(key)).find(
      (x) => x.insightId === insight.insightId,
    );
    expect(trace?.gate?.rejected).toEqual([
      expect.objectContaining({
        codes: expect.arrayContaining(['UNSUPPORTED_NUMBER']),
      }),
    ]);
    const narratives = (await t.reader.narratives(key, {})).filter(
      (n) => n.insightId === insight.insightId,
    );
    expect(narratives.filter((n) => n.source === 'TEMPLATE')).toHaveLength(1);
    expect(narratives).toHaveLength(12);
  });

  it('retries a timeout while attempts remain, then falls back to templates', async () => {
    const insight = (await t.reader.insights(key))[3];
    if (!insight) throw new Error('no insight');
    agents.behave((r) => ({
      status: 200,
      body: fakePipelineResult(r, fixture),
      delayMs: 2_500,
    }));
    await expect(
      t.pipeline.process(job(insight.insightId), attempt(0)),
    ).rejects.toMatchObject({
      kind: 'timeout',
    });
    expect(await t.pipeline.process(job(insight.insightId), attempt(2))).toBe(
      'written',
    );
    const trace = (await t.reader.traces(key)).find(
      (x) => x.insightId === insight.insightId,
    );
    expect(trace).toMatchObject({
      status: 'FALLBACK',
      publication: 'TEMPLATE',
      fallbackReason: 'agents service timed out',
    });
    expect(trace?.runs).toEqual([
      expect.objectContaining({
        provider: 'template',
        outcome: 'FALLBACK',
        retries: 2,
      }),
    ]);
  });
});
