import { postJson, startTestApp, type TestApp } from '../../test/test-app';

jest.setTimeout(60_000);

const LIMIT = 2;

const pauseAs = (t: TestApp, client: string): Promise<number> =>
  postJson(
    `${t.baseUrl}/fixtures/fx_unknown_s1/replay`,
    { action: 'pause' },
    { 'x-forwarded-for': client },
  ).then((res) => res.status);

const exhaust = async (t: TestApp, client: string): Promise<number[]> => {
  const statuses: number[] = [];
  for (let i = 0; i <= LIMIT; i += 1) statuses.push(await pauseAs(t, client));
  return statuses;
};

describe('TRUST_PROXY and per-client replay throttling (integration)', () => {
  it('gives each forwarded client its own replay bucket behind one proxy hop', async () => {
    const t = await startTestApp({
      TRUST_PROXY: '1',
      REPLAY_RATE_LIMIT_PER_MINUTE: String(LIMIT),
    });
    try {
      expect(await exhaust(t, '203.0.113.10')).toEqual([404, 404, 429]);
      expect(await pauseAs(t, '203.0.113.11')).toBe(404);
      // A spoofed left-most address does not buy a fresh bucket.
      expect(await pauseAs(t, '198.51.100.1, 203.0.113.10')).toBe(429);
    } finally {
      await t.close();
    }
  });

  it('ignores X-Forwarded-For when off, so every client shares the socket address', async () => {
    const t = await startTestApp({
      REPLAY_RATE_LIMIT_PER_MINUTE: String(LIMIT),
    });
    try {
      expect(await exhaust(t, '203.0.113.10')).toEqual([404, 404, 429]);
      expect(await pauseAs(t, '203.0.113.11')).toBe(429);
    } finally {
      await t.close();
    }
  });
});
