import { ConfigError, loadEnv, WebServerEnv } from '../index.js';

const signIn = {
  OIDC_ISSUER_URL: 'http://localhost:8180/realms/matchiq',
  OIDC_WEB_CLIENT_ID: 'matchiq-web',
  WEB_SESSION_SECRET: 'w'.repeat(32),
};

const issuesOf = (source: Record<string, string>): string[] => {
  try {
    loadEnv(WebServerEnv, source);
    return [];
  } catch (error) {
    return error instanceof ConfigError ? [...error.issues] : ['unexpected'];
  }
};

describe('WebServerEnv', () => {
  it('runs the public demo with no sign-in settings at all', () => {
    expect(loadEnv(WebServerEnv, {})).toMatchObject({
      WEB_PUBLIC_URL: 'http://localhost:4200',
      OIDC_WEB_SCOPES: 'openid profile',
    });
  });

  it('accepts a complete relying-party configuration', () => {
    expect(issuesOf(signIn)).toEqual([]);
  });

  it('refuses a half-configured relying party', () => {
    expect(issuesOf({ ...signIn, WEB_SESSION_SECRET: '' })).toEqual([
      expect.stringContaining('OIDC_WEB_CLIENT_ID'),
    ]);
  });

  it('rejects a short session secret without echoing it', () => {
    const issues = issuesOf({ ...signIn, WEB_SESSION_SECRET: 'short' });
    expect(issues[0]).toContain('WEB_SESSION_SECRET');
    expect(issues[0]).not.toContain('short');
  });

  it('requires https for the issuer and the public origin in prod', () => {
    expect(issuesOf({ ...signIn, APP_ENV: 'prod' })).toEqual(
      expect.arrayContaining([
        expect.stringContaining('OIDC_ISSUER_URL'),
        expect.stringContaining('WEB_PUBLIC_URL'),
      ]),
    );
  });
});
