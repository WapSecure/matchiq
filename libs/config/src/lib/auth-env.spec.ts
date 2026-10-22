import { AuthEnv, ConfigError, loadEnv } from '../index.js';

const TICKET = 't'.repeat(32);
const KEY = 'k'.repeat(32);
const oidc = {
  STREAM_TICKET_SECRET: TICKET,
  OIDC_ISSUER_URL: 'http://localhost:8180/realms/matchiq',
  OIDC_AUDIENCE: 'matchiq-api',
};

const issuesOf = (source: Record<string, string>): string[] => {
  try {
    loadEnv(AuthEnv, source);
    return [];
  } catch (error) {
    return error instanceof ConfigError ? [...error.issues] : ['unexpected'];
  }
};

describe('AuthEnv', () => {
  it('defaults to OIDC only: anonymous demo and operator key off', () => {
    const env = loadEnv(AuthEnv, oidc);
    expect(env).toMatchObject({
      AUTH_ANONYMOUS_DEMO_ENABLED: false,
      AUTH_OPERATOR_KEY_ENABLED: false,
      AUTH_ANONYMOUS_ORG_ID: 'org_demo',
      OIDC_ORG_CLAIM: 'org',
      OIDC_ROLES_CLAIM: 'roles',
      OIDC_CLOCK_SKEW_SECONDS: 30,
      STREAM_TICKET_TTL_SECONDS: 60,
    });
    expect(env.OPERATOR_API_KEY).toBeUndefined();
  });

  it('requires issuer and audience together', () => {
    expect(issuesOf({ ...oidc, OIDC_AUDIENCE: '' })).toEqual([
      expect.stringContaining('OIDC_AUDIENCE'),
    ]);
  });

  it('requires a key when the operator-key fallback is on', () => {
    expect(issuesOf({ ...oidc, AUTH_OPERATOR_KEY_ENABLED: 'true' })).toEqual([
      expect.stringContaining('OPERATOR_API_KEY'),
    ]);
    expect(
      issuesOf({
        ...oidc,
        AUTH_OPERATOR_KEY_ENABLED: 'true',
        OPERATOR_API_KEY: KEY,
      }),
    ).toEqual([]);
  });

  it('rejects the operator-key fallback and a plain-http issuer in prod', () => {
    const issues = issuesOf({
      ...oidc,
      APP_ENV: 'prod',
      AUTH_OPERATOR_KEY_ENABLED: 'true',
      OPERATOR_API_KEY: KEY,
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining('AUTH_OPERATOR_KEY_ENABLED'),
        expect.stringContaining('OIDC_ISSUER_URL: must use https'),
      ]),
    );
  });

  it('allows an anonymous-only demo without an issuer', () => {
    expect(
      issuesOf({
        STREAM_TICKET_SECRET: TICKET,
        AUTH_ANONYMOUS_DEMO_ENABLED: 'true',
      }),
    ).toEqual([]);
  });

  it('refuses a configuration with no way in', () => {
    expect(issuesOf({ STREAM_TICKET_SECRET: TICKET })).toEqual([
      expect.stringContaining('OIDC_ISSUER_URL'),
    ]);
  });

  it('rejects a short stream ticket secret without echoing it', () => {
    const issues = issuesOf({ ...oidc, STREAM_TICKET_SECRET: 'short' });
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('STREAM_TICKET_SECRET');
    expect(issues[0]).not.toContain('short');
  });

  it('rejects malformed anonymous organisations', () => {
    expect(
      issuesOf({ ...oidc, AUTH_ANONYMOUS_ORG_ID: 'demo; drop table' }),
    ).toEqual([expect.stringContaining('AUTH_ANONYMOUS_ORG_ID')]);
  });
});
