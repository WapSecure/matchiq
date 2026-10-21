import { shot, snapshot } from '@/test/factories';
import { template, trace } from '@/test/session-factories';
import { ApiError } from './api-error';
import {
  createSession,
  fetchAgentRuns,
  fetchFixtureEvents,
  fetchMatchState,
  fetchTemplates,
  sendReplayCommand,
} from './endpoints';

const respond = (body: unknown, init: ResponseInit = {}) =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(body === undefined ? null : JSON.stringify(body), {
        status: 200,
        ...init,
      }),
  );

describe('REST client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns contract-validated data', async () => {
    vi.stubGlobal('fetch', respond({ items: [template()] }));
    await expect(fetchTemplates()).resolves.toHaveLength(1);
  });

  it('rejects responses that violate the contract', async () => {
    vi.stubGlobal(
      'fetch',
      respond({ items: [{ ...template(), eventCount: -1 }] }),
    );
    const error = await fetchTemplates().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('invalidResponse');
    expect((error as ApiError).retryable).toBe(false);
  });

  it('surfaces RFC 9457 problem details', async () => {
    const problem = {
      type: 'urn:matchiq:problem:not-found',
      title: 'Fixture not found',
      status: 404,
      requestId: 'req_1',
    };
    vi.stubGlobal('fetch', respond(problem, { status: 404 }));
    const error = (await fetchMatchState('fx_x').catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.problem).toEqual(problem);
    expect(error.status).toBe(404);
  });

  it('falls back to a generic problem for non-problem error bodies', async () => {
    vi.stubGlobal('fetch', respond({ message: 'boom' }, { status: 502 }));
    const error = (await fetchMatchState('fx_x').catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.problem).toMatchObject({
      status: 502,
      type: 'urn:matchiq:problem:http',
    });
    expect(error.retryable).toBe(true);
  });

  it('maps network failures to a retryable problem', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const error = (await fetchTemplates().catch((e: unknown) => e)) as ApiError;
    expect(error.kind).toBe('network');
  });

  it('normalises both event page shapes and sends pagination params', async () => {
    const fetchMock = respond({ items: [shot(1)], nextAfterSequence: 1 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      fetchFixtureEvents('fx_x', { afterSequence: 0, limit: 50 }),
    ).resolves.toEqual({ items: [shot(1)], nextAfterSequence: 1 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      /\/fixtures\/fx_x\/events\?afterSequence=0&limit=50$/,
    );
    vi.stubGlobal('fetch', respond([shot(2)]));
    await expect(fetchFixtureEvents('fx_x')).resolves.toEqual({
      items: [shot(2)],
      nextAfterSequence: null,
    });
  });

  it('posts validated replay commands with an idempotency key', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 202 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      sendReplayCommand('fx_x', { action: 'start', speed: 30 }),
    ).resolves.toBeNull();
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"action":"start","speed":30}');
    expect(
      (init?.headers as Record<string, string>)['Idempotency-Key'],
    ).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('accepts a snapshot through the state endpoint', async () => {
    vi.stubGlobal('fetch', respond(snapshot()));
    await expect(fetchMatchState('fx_test')).resolves.toMatchObject({
      throughSequence: 10,
    });
  });

  it('creates a session with the chosen speed and an idempotency key', async () => {
    const fetchMock = respond({ fixture: {}, session: {} }, { status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    await createSession('fx_comeback_42', 30).catch(() => undefined);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toMatch(/\/fixtures\/fx_comeback_42\/sessions$/);
    expect(init?.body).toBe('{"speed":30}');
    expect(
      (init?.headers as Record<string, string>)['Idempotency-Key'],
    ).toBeTruthy();
  });

  it('validates agent-run traces', async () => {
    vi.stubGlobal('fetch', respond({ items: [trace()] }));
    await expect(fetchAgentRuns('fx_x')).resolves.toMatchObject([
      { publication: 'TEMPLATE', runs: [{ provider: 'template' }] },
    ]);
  });
});
