import type { Fixture, PipelineRequest } from '@matchiq/contracts';
import {
  fakePipelineResult,
  startFakeAgents,
  type FakeAgentsServer,
} from '../../test/fake-agents';
import { firstOfKind, goldenMoments } from '../../test/golden';
import { buildPipelineRequest } from '../pipeline/pipeline-request';
import { AgentsCallError, HttpAgentsClient } from './agents-client';
import { CircuitBreaker } from './circuit-breaker';

const TOKEN = 'agents-token-'.padEnd(40, 'x');

describe('HttpAgentsClient', () => {
  let server: FakeAgentsServer;
  let request: PipelineRequest;
  let fixture: Fixture;
  const client = (timeoutMs = 2_000) =>
    new HttpAgentsClient({ baseUrl: server.url, token: TOKEN, timeoutMs });

  beforeAll(async () => {
    const golden = await goldenMoments('comeback');
    fixture = golden.fixture;
    request = buildPipelineRequest({
      orgId: 'org_demo',
      fixture,
      insight: firstOfKind(golden.insights, 'GOAL'),
      revision: 1,
      deadlineMs: 2_000,
    });
    server = await startFakeAgents((r) => ({
      status: 200,
      body: fakePipelineResult(r, fixture),
    }));
  });

  afterAll(() => server.close());

  it('posts the PipelineRequest with the service bearer token and parses the result', async () => {
    const result = await client().run(request);
    expect(result.narratives).toHaveLength(9);
    expect(server.requests.at(-1)).toEqual(request);
    expect(server.authorizations.at(-1)).toBe(`Bearer ${TOKEN}`);
    expect(await client().reachable()).toBe(true);
  });

  it.each([
    [503, true],
    [429, true],
    [422, false],
  ])('maps HTTP %i to a %s-retriable failure', async (status, retriable) => {
    server.behave(() => ({ status, body: { title: 'nope' } }));
    await expect(client().run(request)).rejects.toMatchObject({
      kind: 'http',
      retriable,
    });
  });

  it('rejects a response that does not match the PipelineResult contract', async () => {
    server.behave(() => ({ status: 200, body: { narratives: 'many' } }));
    await expect(client().run(request)).rejects.toMatchObject({
      kind: 'invalid-response',
      retriable: false,
    });
  });

  it('times out slow responses as a retriable failure', async () => {
    server.behave((r) => ({
      status: 200,
      body: fakePipelineResult(r, fixture),
      delayMs: 1_500,
    }));
    const error = await client(600)
      .run(request)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AgentsCallError);
    expect(error).toMatchObject({ kind: 'timeout', retriable: true });
  });

  it('reports an unreachable service without throwing from the probe', async () => {
    const dead = new HttpAgentsClient({
      baseUrl: 'http://127.0.0.1:1',
      token: TOKEN,
      timeoutMs: 500,
    });
    expect(await dead.reachable()).toBe(false);
    await expect(dead.run(request)).rejects.toMatchObject({
      kind: 'unreachable',
    });
  });
});

describe('CircuitBreaker', () => {
  it('opens after the threshold, then allows one trial after the cooldown', () => {
    let now = 0;
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      cooldownMs: 1_000,
      now: () => now,
    });
    breaker.recordFailure();
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    expect(breaker.tryAcquire()).toBe(false);
    now = 1_000;
    expect(breaker.tryAcquire()).toBe(true);
    expect(breaker.tryAcquire()).toBe(false);
    breaker.recordFailure();
    expect(breaker.state).toBe('open');
    now = 2_000;
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordSuccess();
    expect(breaker.state).toBe('closed');
  });
});
