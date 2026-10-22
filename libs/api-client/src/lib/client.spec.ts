import { type ApiSchemas, createApiClient } from './client.js';

const BASE = 'https://api.matchiq.test/api/v1';

const fakeFetch = (status: number, body: unknown) => {
  const calls: Request[] = [];
  const fetch = async (request: Request) => {
    calls.push(request);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { calls, fetch };
};

describe('createApiClient', () => {
  it('builds typed paths, path params and query strings', async () => {
    const { calls, fetch } = fakeFetch(200, {
      items: [],
      nextAfterSequence: null,
    });
    const client = createApiClient({ baseUrl: BASE, fetch });
    const { data } = await client.GET('/fixtures/{fixtureId}/events', {
      params: { path: { fixtureId: 'fx_demo' }, query: { limit: 5 } },
    });
    expect(calls[0]?.url).toBe(`${BASE}/fixtures/fx_demo/events?limit=5`);
    const page: ApiSchemas['EventPage'] | undefined = data;
    expect(page?.nextAfterSequence).toBeNull();
  });

  it('sends the Idempotency-Key header and JSON body on commands', async () => {
    const { calls, fetch } = fakeFetch(202, {});
    const client = createApiClient({ baseUrl: BASE, fetch });
    await client.POST('/fixtures/{fixtureId}/replay', {
      params: {
        path: { fixtureId: 'fx_demo' },
        header: { 'Idempotency-Key': 'k-1' },
      },
      body: { action: 'pause' },
    });
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.headers.get('idempotency-key')).toBe('k-1');
    expect(await calls[0]?.json()).toEqual({ action: 'pause' });
  });

  it('surfaces problem details as the typed error', async () => {
    const problem = {
      type: 'urn:matchiq:problem:fixture-not-found',
      title: 'Fixture not found',
      status: 404,
    };
    const { fetch } = fakeFetch(404, problem);
    const client = createApiClient({ baseUrl: BASE, fetch });
    const { error } = await client.GET('/fixtures/{fixtureId}', {
      params: { path: { fixtureId: 'fx_missing' } },
    });
    const typed: ApiSchemas['ProblemDetails'] | undefined = error;
    expect(typed?.type).toBe(problem.type);
  });

  it('rejects undocumented paths at compile time', () => {
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fakeFetch(200, {}).fetch,
    });
    // @ts-expect-error `/matches` is not in the OpenAPI document (ADR-0005 names it `fixtures`).
    expect(() => client.GET('/matches')).toBeDefined();
  });
});
