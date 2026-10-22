import { ApiEnv, ConfigError, WorkerEnv, loadEnv } from '../index.js';

const OPERATOR_KEY = 'k'.repeat(32);
const validApi = {
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  OPERATOR_API_KEY: OPERATOR_KEY,
};

describe('loadEnv', () => {
  it('applies defaults and coerces types', () => {
    const env = loadEnv(ApiEnv, {
      ...validApi,
      API_PORT: '4100',
      CORS_ALLOWED_ORIGINS: 'https://a.com, http://localhost:4200',
    });
    expect(env.API_PORT).toBe(4100);
    expect(env.APP_ENV).toBe('local');
    expect(env.CORS_ALLOWED_ORIGINS).toEqual([
      'https://a.com',
      'http://localhost:4200',
    ]);
  });

  it.each(['*', 'a.com', 'https://a.com/', 'https://*.a.com', 'null'])(
    'rejects the CORS origin %s',
    (origin) => {
      expect(() =>
        loadEnv(ApiEnv, { ...validApi, CORS_ALLOWED_ORIGINS: origin }),
      ).toThrow(ConfigError);
    },
  );

  it('keeps an empty CORS allowlist (deny all)', () => {
    expect(loadEnv(ApiEnv, validApi).CORS_ALLOWED_ORIGINS).toEqual([]);
  });

  it('defaults the ledger, relay and stream settings', () => {
    const env = loadEnv(ApiEnv, validApi);
    expect(env).toMatchObject({
      DATABASE_POOL_MAX: 10,
      REDIS_KEY_PREFIX: 'matchiq',
      OUTBOX_RELAY_ENABLED: true,
      OUTBOX_POLL_INTERVAL_MS: 250,
      OUTBOX_BATCH_SIZE: 200,
      SSE_HEARTBEAT_MS: 15_000,
    });
    expect(
      loadEnv(ApiEnv, { ...validApi, OUTBOX_RELAY_ENABLED: 'false' })
        .OUTBOX_RELAY_ENABLED,
    ).toBe(false);
  });

  it('rejects unsafe Redis key prefixes and unbounded relay batches', () => {
    expect(() =>
      loadEnv(ApiEnv, { ...validApi, REDIS_KEY_PREFIX: 'Bad Prefix*' }),
    ).toThrow(ConfigError);
    expect(() =>
      loadEnv(ApiEnv, { ...validApi, OUTBOX_BATCH_SIZE: '100000' }),
    ).toThrow(ConfigError);
  });

  it('reports every missing variable by name', () => {
    expect.assertions(2);
    try {
      loadEnv(ApiEnv, {});
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toEqual(
        expect.arrayContaining([
          'DATABASE_URL: is required',
          'REDIS_URL: is required',
          'OPERATOR_API_KEY: is required',
        ]),
      );
    }
  });

  it('never echoes received values in error messages', () => {
    const secret = 'short-secret-value';
    expect(() =>
      loadEnv(ApiEnv, { ...validApi, OPERATOR_API_KEY: secret }),
    ).toThrow(ConfigError);
    try {
      loadEnv(ApiEnv, { ...validApi, OPERATOR_API_KEY: secret });
    } catch (error) {
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('rejects non-postgres database URLs', () => {
    expect(() =>
      loadEnv(ApiEnv, { ...validApi, DATABASE_URL: 'mysql://x@y/z' }),
    ).toThrow(ConfigError);
  });

  it('caps agent retries at the specification limit of two', () => {
    const base = { ...validApi, AGENTS_SERVICE_TOKEN: OPERATOR_KEY };
    expect(loadEnv(WorkerEnv, base).AGENT_MAX_RETRIES).toBe(2);
    expect(() =>
      loadEnv(WorkerEnv, { ...base, AGENT_MAX_RETRIES: '3' }),
    ).toThrow(ConfigError);
  });

  it('parses boolean flags strictly', () => {
    const base = { ...validApi, AGENTS_SERVICE_TOKEN: OPERATOR_KEY };
    expect(loadEnv(WorkerEnv, { ...base, AI_ENABLED: 'true' }).AI_ENABLED).toBe(
      true,
    );
    expect(() => loadEnv(WorkerEnv, { ...base, AI_ENABLED: 'yes' })).toThrow(
      ConfigError,
    );
  });
});

describe('.env.example compatibility', () => {
  it('treats blank optional variables as unset', () => {
    const env = loadEnv(ApiEnv, {
      ...validApi,
      OTEL_SERVICE_NAME: '',
      APPLICATIONINSIGHTS_CONNECTION_STRING: '',
    });
    expect(env.OTEL_SERVICE_NAME).toBeUndefined();
    expect(env.APPLICATIONINSIGHTS_CONNECTION_STRING).toBeUndefined();
  });
});
