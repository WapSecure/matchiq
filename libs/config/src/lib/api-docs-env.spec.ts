import { ApiEnv, ConfigError, apiDocsEnabled, loadEnv } from '../index.js';

const base = {
  DATABASE_URL: 'postgresql://matchiq:matchiq@localhost:5432/matchiq',
  REDIS_URL: 'redis://localhost:6379',
  STREAM_TICKET_SECRET: 's'.repeat(32),
  AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
};

const docsFor = (env: Record<string, string>) =>
  apiDocsEnabled(loadEnv(ApiEnv, { ...base, ...env }));

describe('API_DOCS_ENABLED', () => {
  it('defaults to on outside prod and off in prod', () => {
    expect(docsFor({})).toBe(true);
    expect(docsFor({ API_DOCS_ENABLED: '' })).toBe(true);
    expect(docsFor({ APP_ENV: 'stage' })).toBe(true);
    expect(docsFor({ APP_ENV: 'prod' })).toBe(false);
  });

  it('overrides the default either way', () => {
    expect(docsFor({ APP_ENV: 'prod', API_DOCS_ENABLED: 'true' })).toBe(true);
    expect(docsFor({ API_DOCS_ENABLED: 'false' })).toBe(false);
  });

  it('rejects other values', () => {
    expect(() => loadEnv(ApiEnv, { ...base, API_DOCS_ENABLED: 'yes' })).toThrow(
      ConfigError,
    );
  });
});
