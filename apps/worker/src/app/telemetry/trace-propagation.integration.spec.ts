import { SpanKind, trace } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BullMqReplayCommandBus, type FixtureKey, QUEUES } from '@matchiq/db';
import { testRedisUrl } from '@matchiq/db/testing';
import { markTracingActive, queueTelemetry } from '@matchiq/server-kit';
import { Redis } from 'ioredis';
import {
  fakePipelineResult,
  startFakeAgents,
  type FakeAgentsServer,
} from '../../test/fake-agents';
import { loadGolden } from '../../test/golden';
import { ORG, startTestWorker, type TestWorker } from '../../test/test-worker';

jest.setTimeout(120_000);

const TEMPLATE = 'fx_comeback_42';
const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
});

const until = async (
  check: () => boolean | Promise<boolean>,
): Promise<void> => {
  for (let i = 0; i < 400; i += 1) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('condition not met in time');
};

const traceIdOf = (traceparent: string | undefined): string | undefined =>
  traceparent?.split('-')[1];

/**
 * Stands in for the API (a SERVER span sending the replay command through the
 * real BullMQ producer) and checks one trace reaches the worker's command
 * consumer, the insight job it enqueues, and the agents HTTP call.
 */
describe('W3C trace context: api -> BullMQ -> worker -> agents (integration)', () => {
  let agents: FakeAgentsServer;
  let t: TestWorker;
  let apiQueue: Redis;
  let bus: BullMqReplayCommandBus;

  beforeAll(async () => {
    provider.register();
    markTracingActive(true);
    const golden = await loadGolden('comeback');
    agents = await startFakeAgents((r) => ({
      status: 200,
      body: fakePipelineResult(r, {
        ...golden.fixture,
        fixtureId: r.packet.fixtureId,
      }),
    }));
    t = await startTestWorker({
      consumeQueues: true,
      env: {
        AI_ENABLED: 'true',
        AGENTS_SERVICE_URL: agents.url,
        AGENT_TIMEOUT_MS: '2000',
      },
    });
    apiQueue = new Redis(testRedisUrl(), { maxRetriesPerRequest: null });
    bus = new BullMqReplayCommandBus({
      connection: apiQueue,
      prefix: t.env.REDIS_KEY_PREFIX,
      telemetry: queueTelemetry(),
    });
  });

  afterAll(async () => {
    await bus.close();
    apiQueue.disconnect();
    await t.close();
    await agents.close();
    markTracingActive(false);
    await provider.shutdown();
  });

  it('carries one trace from the replay request to the agents call', async () => {
    const created = await t.store.create({
      orgId: ORG,
      templateId: TEMPLATE,
      speed: 30,
    });
    if (created === null) throw new Error('template missing');
    const key: FixtureKey = {
      orgId: ORG,
      fixtureId: created.fixture.fixtureId,
    };

    const tracer = trace.getTracer('api-under-test');
    const traceId = await tracer.startActiveSpan(
      'POST /api/v1/fixtures/:fixtureId/replay',
      { kind: SpanKind.SERVER },
      async (span) => {
        await bus.send({ ...key, command: { action: 'start', speed: 30 } });
        // Virtual time advances inside the request context, as real timers would carry it.
        await until(async () => {
          t.scheduler.runAll();
          await t.sessions.whenIdle(key.fixtureId);
          return agents.requests.length > 0;
        });
        span.end();
        return span.spanContext().traceId;
      },
    );

    const spans = exporter.getFinishedSpans();
    const inTrace = (name: string, kind: SpanKind) =>
      spans.some(
        (s) =>
          s.name === name &&
          s.kind === kind &&
          s.spanContext().traceId === traceId,
      );
    expect(inTrace(`process ${QUEUES.replayCommands}`, SpanKind.CONSUMER)).toBe(
      true,
    );
    await until(() =>
      exporter
        .getFinishedSpans()
        .some(
          (s) =>
            s.name === 'agents.pipeline' && s.spanContext().traceId === traceId,
        ),
    );
    const finished = exporter.getFinishedSpans();
    expect(
      finished.some(
        (s) =>
          s.name === `process ${QUEUES.insightPipeline}` &&
          s.kind === SpanKind.CONSUMER &&
          s.spanContext().traceId === traceId,
      ),
    ).toBe(true);
    expect(agents.traceparents.length).toBeGreaterThan(0);
    expect(agents.traceparents.map(traceIdOf)).toContain(traceId);
  });
});
