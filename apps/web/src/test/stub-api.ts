type Reply = { status?: number; body: unknown };
export type Routes = Record<string, Reply | ((url: URL) => Reply)>;

const NOT_FOUND: Reply = {
  status: 404,
  body: {
    type: 'urn:matchiq:problem:not-found',
    title: 'Not Found',
    status: 404,
  },
};

/**
 * Stubs `fetch` with a table keyed by `METHOD path-suffix` (query ignored).
 * The longest matching suffix wins; unknown routes answer 404 problems.
 * Returns the mock so tests can inspect calls.
 */
export const stubApi = (routes: Routes) => {
  const keys = Object.keys(routes).sort((a, b) => b.length - a.length);
  const mock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const key = keys.find((k) => {
      const [m, suffix = ''] = k.split(' ');
      return m === method && url.pathname.endsWith(suffix);
    });
    const route = key ? routes[key] : undefined;
    const reply =
      typeof route === 'function' ? route(url) : (route ?? NOT_FOUND);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
    });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
};

export const callsTo = (mock: ReturnType<typeof stubApi>, suffix: string) =>
  mock.mock.calls.filter(([input]) =>
    new URL(String(input)).pathname.endsWith(suffix),
  );
