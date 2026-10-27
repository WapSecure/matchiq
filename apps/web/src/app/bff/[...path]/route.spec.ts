// @vitest-environment node
import { NextRequest } from 'next/server';
import { BFF } from '@/constants/auth';
import { GET, POST } from './route';

const WEB_ORIGIN = 'https://app.matchiq.test';
const FOREIGN_ORIGIN = 'https://evil.example';
const UPSTREAM_BODY = '{"ok":true}';

vi.mock('@/lib/auth/server/env', () => ({
  oidcSettings: () => ({
    WEB_PUBLIC_URL: 'https://app.matchiq.test',
    API_INTERNAL_BASE_URL: 'http://api.internal',
  }),
}));
vi.mock('@/lib/auth/server/live-session', () => ({
  liveSession: async () => ({
    kind: 'active',
    refreshed: false,
    session: { accessToken: 'token' },
  }),
  settle: async (response: Response) => response,
}));

const post = (headers: Record<string, string>) =>
  POST(
    new NextRequest(`${WEB_ORIGIN}/bff/fixtures`, {
      method: 'POST',
      headers,
      body: '{}',
    }),
    { params: Promise.resolve({ path: ['fixtures'] }) },
  );

describe('BFF cross-origin refusal', () => {
  const upstream = vi.fn();

  beforeEach(() => {
    upstream.mockReset();
    upstream.mockImplementation(async () => new Response(UPSTREAM_BODY));
    vi.stubGlobal('fetch', upstream);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['a foreign Origin', { origin: FOREIGN_ORIGIN }],
    ['a foreign Referer and no Origin', { referer: `${FOREIGN_ORIGIN}/x` }],
    ['no Origin or Referer', {}],
  ])('refuses a state-changing request with %s', async (_label, headers) => {
    const response = await post(headers);
    expect(response.status).toBe(BFF.status.forbidden);
    expect(((await response.json()) as { title: string }).title).toBe(
      BFF.titles.crossOrigin,
    );
    expect(upstream).not.toHaveBeenCalled();
  });

  it('forwards a same-origin state-changing request with the bearer token', async () => {
    const response = await post({ origin: WEB_ORIGIN });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(UPSTREAM_BODY);
    const [url, init] = upstream.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.internal/fixtures');
    expect((init.headers as Headers).get(BFF.authorization)).toBe(
      `${BFF.bearer}token`,
    );
  });
});

describe('BFF expected not-found', () => {
  const get = (path: string[]) =>
    GET(new NextRequest(`${WEB_ORIGIN}/bff/${path.join('/')}`), {
      params: Promise.resolve({ path }),
    });
  const answer = (status: number) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(status === 404 ? '{}' : 'x', { status })),
    );
  afterEach(() => vi.unstubAllGlobals());

  it('answers 204 for a missing agent trace', async () => {
    answer(404);
    const response = await get(['agents', 'traces', 'abc']);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('keeps every other 404 and any trace failure visible', async () => {
    answer(404);
    expect((await get(['fixtures', 'nope'])).status).toBe(404);
    answer(500);
    expect((await get(['agents', 'traces', 'abc'])).status).toBe(500);
  });
});
