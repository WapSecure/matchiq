import type {
  AgentRun,
  Fixture,
  PipelineRequest,
  PipelineResult,
} from '@matchiq/contracts';
import type { FixtureKey } from '@matchiq/db';
import {
  fakePipelineResult,
  startFakeAgents,
  type FakeAgentsServer,
} from '../../test/fake-agents';
import {
  replayToEnd,
  startTestWorker,
  type TestWorker,
} from '../../test/test-worker';
import { templateDrafts } from '../pipeline/templates/template-narratives';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';

/** What the agents service answers for MODEL_TIMEOUT (see apps/agents tests/test_faults.py). */
const timeoutChain = (r: PipelineRequest, fixture: Fixture): PipelineResult => {
  const base = fakePipelineResult(r, fixture);
  const [run] = base.runs;
  if (!run) throw new Error('no run');
  const step = (patch: Partial<AgentRun>): AgentRun => ({
    ...run,
    faultInjected: 'MODEL_TIMEOUT',
    ...patch,
  });
  return {
    ...base,
    status: 'FALLBACK',
    narratives: templateDrafts(r.packet.insight, fixture, {
      personas: r.personas,
      locales: r.locales,
    }),
    overlay: null,
    fallbackReason: 'circuit breaker opened after simulated timeouts',
    runs: [
      step({ agent: 'MATCH_ANALYST', outcome: 'TIMED_OUT', retries: 2 }),
      step({
        agent: 'MATCH_ANALYST',
        provider: 'template',
        outcome: 'FALLBACK',
      }),
      step({ agent: 'NARRATIVE_WRITER', outcome: 'FAILED' }),
    ],
  };
};

describe('demo fault plans through the worker (integration, ADR-0017)', () => {
  let agents: FakeAgentsServer;
  let t: TestWorker;
  let fixture: Fixture;

  beforeAll(async () => {
    agents = await startFakeAgents((r) => ({
      status: 200,
      body:
        r.fault === 'MODEL_TIMEOUT'
          ? timeoutChain(r, { ...fixture, fixtureId: r.packet.fixtureId })
          : fakePipelineResult(r, {
              ...fixture,
              fixtureId: r.packet.fixtureId,
            }),
    }));
    t = await startTestWorker({
      env: {
        AI_ENABLED: 'true',
        DEMO_FAULTS_ENABLED: 'true',
        AGENTS_SERVICE_URL: agents.url,
        AGENT_TIMEOUT_MS: '500',
      },
    });
  });

  afterAll(async () => {
    await t.close();
    await agents.close();
  });

  const attempt = { attemptsMade: 0, maxAttempts: 3 };
  const runAll = async (key: FixtureKey, count: number) => {
    const insights = (await t.reader.insights(key)).slice(0, count);
    for (const i of insights) {
      await t.pipeline.process(
        { ...key, insightId: i.insightId, revision: 1 },
        attempt,
      );
    }
    return insights;
  };
  const sessionFixture = async (key: FixtureKey) => {
    const stored = await t.db.db.query.fixtures.findFirst({
      where: (f, { eq }) => eq(f.fixtureId, key.fixtureId),
    });
    if (!stored) throw new Error('no fixture');
    fixture = stored.payload;
  };

  it('MODEL_TIMEOUT: faults every 2nd insight, airs templates and records TIMED_OUT then FALLBACK', async () => {
    const key = await replayToEnd(t, TEMPLATE, 30, {
      scenario: 'MODEL_TIMEOUT',
      everyNth: 2,
    });
    await sessionFixture(key);
    const insights = await runAll(key, 3);
    const sent = agents.requests.filter(
      (r) => r.packet.fixtureId === key.fixtureId,
    );
    expect(sent.map((r) => r.fault)).toEqual([
      'MODEL_TIMEOUT',
      undefined,
      'MODEL_TIMEOUT',
    ]);

    const traces = await t.reader.traces(key);
    const faulted = traces.find((x) => x.insightId === insights[0]?.insightId);
    expect(faulted).toMatchObject({
      status: 'FALLBACK',
      publication: 'TEMPLATE',
    });
    expect(faulted?.runs.map((r) => r.outcome)).toEqual([
      'TIMED_OUT',
      'FALLBACK',
      'FAILED',
    ]);
    expect(
      faulted?.runs.every((r) => r.faultInjected === 'MODEL_TIMEOUT'),
    ).toBe(true);
    const aired = (await t.reader.narratives(key, {})).filter(
      (n) => n.insightId === insights[0]?.insightId,
    );
    expect(aired).toHaveLength(12);
    expect(new Set(aired.map((n) => n.source))).toEqual(new Set(['TEMPLATE']));

    const clean = traces.find((x) => x.insightId === insights[1]?.insightId);
    expect(clean).toMatchObject({ publication: 'AGENT' });
    expect(clean?.runs.some((r) => r.faultInjected !== undefined)).toBe(false);
  });

  it('GATE_REJECT: the publish gate rejects the altered draft and its template airs', async () => {
    const key = await replayToEnd(t, TEMPLATE, 30, {
      scenario: 'GATE_REJECT',
      everyNth: 1,
    });
    await sessionFixture(key);
    const [first] = await runAll(key, 1);
    const trace = (await t.reader.traces(key)).find(
      (x) => x.insightId === first?.insightId,
    );
    expect(trace?.gate?.rejected).toEqual([
      expect.objectContaining({
        source: 'AGENT',
        codes: expect.arrayContaining(['UNSUPPORTED_NUMBER']),
      }),
    ]);
    expect(trace?.runs[0]).toMatchObject({
      faultInjected: 'GATE_REJECT',
      faultNote: expect.stringContaining('fault.injected'),
    });
    const aired = (await t.reader.narratives(key, {})).filter(
      (n) => n.insightId === first?.insightId,
    );
    expect(aired.filter((n) => n.source === 'TEMPLATE')).toHaveLength(1);
    expect(aired).toHaveLength(12);
  });

  it('sends no fault for a session created without a plan', async () => {
    const key = await replayToEnd(t, TEMPLATE);
    await sessionFixture(key);
    await runAll(key, 2);
    const sent = agents.requests.filter(
      (r) => r.packet.fixtureId === key.fixtureId,
    );
    expect(sent.every((r) => r.fault === undefined)).toBe(true);
  });
});
