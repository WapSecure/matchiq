import { ApiEnv, ConfigError, WorkerEnv, loadEnv } from '../index.js';

const base = {
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  OPERATOR_API_KEY: 'k'.repeat(32),
  AGENTS_SERVICE_TOKEN: 't'.repeat(32),
  STREAM_TICKET_SECRET: 's'.repeat(32),
  AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
};

describe('DEMO_FAULTS_ENABLED', () => {
  it.each([
    ['api', ApiEnv],
    ['worker', WorkerEnv],
  ] as const)('defaults to off for the %s', (_, schema) => {
    expect(loadEnv(schema, base).DEMO_FAULTS_ENABLED).toBe(false);
  });

  it.each(['local', 'test', 'dev', 'stage'])('is allowed in %s', (env) => {
    const parsed = loadEnv(WorkerEnv, {
      ...base,
      APP_ENV: env,
      DEMO_FAULTS_ENABLED: 'true',
    });
    expect(parsed.DEMO_FAULTS_ENABLED).toBe(true);
  });

  it.each([
    ['api', ApiEnv],
    ['worker', WorkerEnv],
  ] as const)('is refused at startup in prod for the %s', (_, schema) => {
    expect.assertions(2);
    try {
      loadEnv(schema, {
        ...base,
        APP_ENV: 'prod',
        DEMO_FAULTS_ENABLED: 'true',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).issues).toContain(
        'DEMO_FAULTS_ENABLED: must be false when APP_ENV=prod (ADR-0020)',
      );
    }
  });
});
