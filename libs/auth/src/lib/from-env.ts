import type { AuthEnv } from '@matchiq/config';
import { AccessTokenVerifier } from './access-token-verifier';
import { Authenticator } from './authenticator';
import { StreamTickets } from './stream-tickets';

export interface AuthComponents {
  readonly authenticator: Authenticator;
  readonly tickets: StreamTickets;
}

/** Wires the authenticator from validated configuration (`AuthEnv` rules already applied). */
export const authFromEnv = (
  env: AuthEnv,
  overrides: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): AuthComponents => {
  const tickets = new StreamTickets({
    secret: env.STREAM_TICKET_SECRET,
    ttlSeconds: env.STREAM_TICKET_TTL_SECONDS,
    ...(overrides.now ? { now: overrides.now } : {}),
  });
  const verifier =
    env.OIDC_ISSUER_URL !== undefined && env.OIDC_AUDIENCE !== undefined
      ? new AccessTokenVerifier({
          issuer: env.OIDC_ISSUER_URL,
          audience: env.OIDC_AUDIENCE,
          ...(env.OIDC_JWKS_URL ? { jwksUrl: env.OIDC_JWKS_URL } : {}),
          clockSkewSeconds: env.OIDC_CLOCK_SKEW_SECONDS,
          mapping: {
            orgClaim: env.OIDC_ORG_CLAIM,
            rolesClaim: env.OIDC_ROLES_CLAIM,
            nameClaim: env.OIDC_NAME_CLAIM,
            orgNameClaim: env.OIDC_ORG_NAME_CLAIM,
          },
          ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
        })
      : null;
  const operatorKey =
    env.AUTH_OPERATOR_KEY_ENABLED && env.OPERATOR_API_KEY !== undefined
      ? { key: env.OPERATOR_API_KEY, orgId: env.AUTH_OPERATOR_KEY_ORG_ID }
      : null;
  return {
    tickets,
    authenticator: new Authenticator({
      verifier,
      tickets,
      anonymousOrgId: env.AUTH_ANONYMOUS_DEMO_ENABLED
        ? env.AUTH_ANONYMOUS_ORG_ID
        : null,
      operatorKey,
    }),
  };
};
