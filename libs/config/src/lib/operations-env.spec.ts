import { ApiEnv, ConfigError, WorkerEnv, loadEnv } from '../index.js';

const base = {
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  STREAM_TICKET_SECRET: 's'.repeat(32),
  AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
  AGENTS_SERVICE_TOKEN: 't'.repeat(32),
};

const trustProxyOf = (value: string | undefined) =>
  loadEnv(ApiEnv, { ...base, TRUST_PROXY: value }).TRUST_PROXY;

describe('TRUST_PROXY', () => {
  it('is off by default and for false, blank or zero hops', () => {
    expect(trustProxyOf(undefined)).toBe(false);
    expect(trustProxyOf('')).toBe(false);
    expect(trustProxyOf('false')).toBe(false);
    expect(trustProxyOf('0')).toBe(false);
  });

  it('accepts a hop count', () => {
    expect(trustProxyOf('1')).toBe(1);
    expect(trustProxyOf('2')).toBe(2);
  });

  it('accepts IPs, CIDRs and the named Express ranges', () => {
    expect(
      trustProxyOf('loopback, 10.0.0.0/8 ,172.18.0.2,::1,fd00::/8'),
    ).toEqual(['loopback', '10.0.0.0/8', '172.18.0.2', '::1', 'fd00::/8']);
  });

  it.each(['true', '11', 'proxy.local', '10.0.0.0/33', ' , '])(
    'rejects %j without echoing it',
    (value) => {
      expect.assertions(2);
      try {
        trustProxyOf(value);
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).issues[0]).toMatch(/^TRUST_PROXY: /);
      }
    },
  );
});

describe('replay capacity and retention settings', () => {
  it('shares capacity defaults between the API and the worker', () => {
    for (const env of [loadEnv(ApiEnv, base), loadEnv(WorkerEnv, base)]) {
      expect(env).toMatchObject({
        REPLAY_MAX_ACTIVE_SESSIONS: 10,
        REPLAY_IDLE_TIMEOUT_MS: 600_000,
      });
    }
  });

  it('defaults retention to 7 days of sessions and 24 hours of idempotency keys', () => {
    expect(loadEnv(WorkerEnv, base)).toMatchObject({
      RETENTION_ENABLED: true,
      SESSION_RETENTION_DAYS: 7,
      IDEMPOTENCY_RETENTION_HOURS: 24,
      RETENTION_INTERVAL_MS: 3_600_000,
    });
  });

  it('rejects out-of-range values', () => {
    expect(() =>
      loadEnv(WorkerEnv, { ...base, SESSION_RETENTION_DAYS: '0' }),
    ).toThrow(ConfigError);
    expect(() =>
      loadEnv(ApiEnv, { ...base, REPLAY_IDLE_TIMEOUT_MS: '10' }),
    ).toThrow(ConfigError);
  });
});
