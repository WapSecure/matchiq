import {
  AUTH_HEADER,
  jsonOf,
  postJson,
  startTestApp,
  type TestApp,
} from '../test/test-app';

jest.setTimeout(20_000);

const PROBLEM_CONTENT_TYPE = 'application/problem+json';
const OVERSIZED_BYTES = 2 * 1024 * 1024 + 1024;
const PADDING = (bytes: number) => ({ padding: 'x'.repeat(bytes) });

describe('Request size limit (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(() => t.close());

  it('refuses a body over 2 MB with a 413 problem and no echo of the payload', async () => {
    const res = await postJson(
      `${t.baseUrl}/fixtures`,
      PADDING(OVERSIZED_BYTES),
      AUTH_HEADER,
    );
    expect(res.status).toBe(413);
    expect(res.headers.get('content-type')).toContain(PROBLEM_CONTENT_TYPE);
    const problem = await jsonOf(res);
    expect(problem).toMatchObject({
      type: 'urn:matchiq:problem:http-413',
      title: 'Request body too large',
      status: 413,
      instance: '/api/v1/fixtures',
    });
    expect(JSON.stringify(problem)).not.toContain('xxxx');
  });

  it('still reads a body under the limit as a validation failure, not a size failure', async () => {
    const res = await postJson(
      `${t.baseUrl}/fixtures`,
      PADDING(1024 * 1024),
      AUTH_HEADER,
    );
    expect(res.status).not.toBe(413);
    expect(res.status).toBeLessThan(500);
  });
});
