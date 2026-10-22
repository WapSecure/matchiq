import { z } from 'zod';
import {
  AUTH_DEFAULTS,
  AUTH_ENV_MESSAGES,
  HTTPS_PROTOCOL,
  PROD_ENVIRONMENT,
} from './auth-constants.js';
import { DEFAULT_DEMO_ORG_ID } from './constants.js';
import {
  booleanFlag,
  boundedInt,
  optionalSecret,
  optionalString,
  optionalUrl,
  orgIdField,
  secret,
} from './fields.js';
import { AppEnvironment } from './schemas.js';

/** Claim names differ per identity provider (Keycloak, Entra ID); ADR-0015. */
export const OidcClaimFields = {
  OIDC_ORG_CLAIM: z.string().min(1).default(AUTH_DEFAULTS.orgClaim),
  OIDC_ROLES_CLAIM: z.string().min(1).default(AUTH_DEFAULTS.rolesClaim),
  OIDC_NAME_CLAIM: z.string().min(1).default(AUTH_DEFAULTS.nameClaim),
  OIDC_ORG_NAME_CLAIM: z.string().min(1).default(AUTH_DEFAULTS.orgNameClaim),
};

/** Resource-server settings for the API (ADR-0015). */
export const AuthFields = {
  OIDC_ISSUER_URL: optionalUrl,
  OIDC_AUDIENCE: optionalString,
  /** Overrides discovery, e.g. a container-network URL for the same issuer. */
  OIDC_JWKS_URL: optionalUrl,
  OIDC_CLOCK_SKEW_SECONDS: boundedInt(
    0,
    AUTH_DEFAULTS.clockSkewMaxSeconds,
    AUTH_DEFAULTS.clockSkewSeconds,
  ),
  ...OidcClaimFields,
  /** Requests without credentials act as the read-only demo tenant. */
  AUTH_ANONYMOUS_DEMO_ENABLED: booleanFlag,
  AUTH_ANONYMOUS_ORG_ID: orgIdField(DEFAULT_DEMO_ORG_ID),
  /** Dev/CI fallback only; rejected in prod. */
  AUTH_OPERATOR_KEY_ENABLED: booleanFlag,
  OPERATOR_API_KEY: optionalSecret,
  AUTH_OPERATOR_KEY_ORG_ID: orgIdField(DEFAULT_DEMO_ORG_ID),
  STREAM_TICKET_SECRET: secret,
  STREAM_TICKET_TTL_SECONDS: boundedInt(
    AUTH_DEFAULTS.streamTicketTtlMinSeconds,
    AUTH_DEFAULTS.streamTicketTtlMaxSeconds,
    AUTH_DEFAULTS.streamTicketTtlSeconds,
  ),
};

const AuthObject = z.object({
  APP_ENV: AppEnvironment.default('local'),
  ...AuthFields,
});
type AuthShape = z.infer<typeof AuthObject>;

const issue = (ctx: z.RefinementCtx, path: string, message: string) =>
  ctx.addIssue({ code: 'custom', path: [path], message });

const isHttps = (url: string | undefined): boolean =>
  url === undefined || new URL(url).protocol === HTTPS_PROTOCOL;

/** Cross-field rules shared by every schema that embeds `AuthFields`. */
export const checkAuthEnv = (env: AuthShape, ctx: z.RefinementCtx): void => {
  const prod = env.APP_ENV === PROD_ENVIRONMENT;
  if ((env.OIDC_ISSUER_URL === undefined) !== (env.OIDC_AUDIENCE === undefined))
    issue(ctx, 'OIDC_AUDIENCE', AUTH_ENV_MESSAGES.issuerAudiencePair);
  if (env.AUTH_OPERATOR_KEY_ENABLED && env.OPERATOR_API_KEY === undefined)
    issue(ctx, 'OPERATOR_API_KEY', AUTH_ENV_MESSAGES.operatorKeyMissing);
  if (prod && env.AUTH_OPERATOR_KEY_ENABLED)
    issue(
      ctx,
      'AUTH_OPERATOR_KEY_ENABLED',
      AUTH_ENV_MESSAGES.operatorKeyInProd,
    );
  if (prod && !isHttps(env.OIDC_ISSUER_URL))
    issue(ctx, 'OIDC_ISSUER_URL', AUTH_ENV_MESSAGES.httpsInProd);
  const anyPath =
    env.OIDC_ISSUER_URL !== undefined ||
    env.AUTH_ANONYMOUS_DEMO_ENABLED ||
    env.AUTH_OPERATOR_KEY_ENABLED;
  if (!anyPath) issue(ctx, 'OIDC_ISSUER_URL', AUTH_ENV_MESSAGES.noAccessPath);
};

export const AuthEnv = AuthObject.superRefine(checkAuthEnv);
export type AuthEnv = z.infer<typeof AuthEnv>;
