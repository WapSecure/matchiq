import { redact, scrubText } from './redaction';
import { REDACTED } from './telemetry.constants';

describe('log redaction', () => {
  it.each([
    'authorization',
    'Authorization',
    'cookie',
    'password',
    'DATABASE_PASSWORD',
    'clientSecret',
    'AGENTS_SERVICE_TOKEN',
    'accessToken',
    'apiKey',
    'x-api-key',
    'OPERATOR_API_KEY',
    'APPLICATIONINSIGHTS_CONNECTION_STRING',
    'credentials',
    'privateKey',
    'ticket',
  ])('masks the value of a field named %s', (key) => {
    expect(redact({ [key]: 'value-that-must-not-leak' })).toEqual({
      [key]: REDACTED,
    });
  });

  it.each(['tokensIn', 'tokensOut', 'fixtureId', 'requestId', 'route'])(
    'keeps the operational field %s',
    (key) => {
      expect(redact({ [key]: 42 })).toEqual({ [key]: 42 });
    },
  );

  it('masks nested fields and fields inside arrays', () => {
    expect(
      redact({
        headers: { authorization: 'Bearer abc', accept: 'json' },
        items: [{ password: 'p' }, { name: 'ok' }],
      }),
    ).toEqual({
      headers: { authorization: REDACTED, accept: 'json' },
      items: [{ password: REDACTED }, { name: 'ok' }],
    });
  });

  it.each([
    ['Bearer eyJhbGciOi.payload.sig rejected', `Bearer ${REDACTED} rejected`],
    [
      'connect postgresql://matchiq:hunter2@db:5432/matchiq failed',
      `connect postgresql://${REDACTED}@db:5432/matchiq failed`,
    ],
    [
      'redis://default:s3cret@cache:6379 refused',
      `redis://${REDACTED}@cache:6379 refused`,
    ],
    [
      'InstrumentationKey=00000000-0000;IngestionEndpoint=https://x',
      `InstrumentationKey=${REDACTED};IngestionEndpoint=https://x`,
    ],
    [
      '/api/v1/fixtures/fx_1/stream?ticket=abc.def',
      `/api/v1/fixtures/fx_1/stream?ticket=${REDACTED}`,
    ],
  ])('scrubs credentials from text: %s', (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it('scrubs strings at any depth and reduces errors to name and message', () => {
    const error = new Error('login with Bearer t0k3n failed');
    expect(redact({ detail: { err: error } })).toEqual({
      detail: {
        err: { name: 'Error', message: `login with Bearer ${REDACTED} failed` },
      },
    });
  });

  it('bounds nesting so a cyclic or huge object cannot stall logging', () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 10; i += 1) {
      cursor['next'] = {};
      cursor = cursor['next'] as Record<string, unknown>;
    }
    expect(JSON.stringify(redact(deep))).toContain(REDACTED);
  });

  it('does not mutate its input', () => {
    const input = { password: 'p' };
    redact(input);
    expect(input.password).toBe('p');
  });
});
