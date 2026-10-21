import type { ApiEnv } from '@matchiq/config';
import { APP_ENV } from '@matchiq/server-kit';
import { jsonOf, startTestApp, type TestApp } from '../test/test-app';

jest.setTimeout(20_000);

describe('API AppModule (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(() => t.close());

  it('serves liveness under the versioned prefix', async () => {
    const res = await fetch(`${t.baseUrl}/health/live`);
    expect(res.status).toBe(200);
    expect(await jsonOf(res)).toMatchObject({
      service: 'matchiq-api',
      version: '1.2.3',
    });
  });

  it('reports Postgres and Redis in readiness', async () => {
    const res = await fetch(`${t.baseUrl}/health/ready`);
    expect(res.status).toBe(200);
    expect(await jsonOf(res)).toMatchObject({
      status: 'ok',
      checks: { postgres: { status: 'ok' }, redis: { status: 'ok' } },
    });
  });

  it('answers unknown routes with problem details', async () => {
    const res = await fetch(`${t.baseUrl}/nope`);
    expect(res.status).toBe(404);
    expect((await jsonOf(res)).type).toBe('urn:matchiq:problem:not-found');
  });

  it('exposes frozen configuration', () => {
    const provided = t.app.get<ApiEnv>(APP_ENV);
    expect(Object.isFrozen(provided)).toBe(true);
  });
});
