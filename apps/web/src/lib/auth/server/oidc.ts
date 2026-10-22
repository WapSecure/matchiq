import { principalFromClaims } from '@matchiq/access';
import * as client from 'openid-client';
import { AUTH_ROUTES } from '@/constants/auth';
import { callbackUrl, type OidcSettings } from './env';
import type { AuthTransaction, SessionUser, WebSession } from './session';

let configuration: Promise<client.Configuration> | null = null;

/** Discovery is cached per process; a failure is retried on the next request. */
const config = (env: OidcSettings): Promise<client.Configuration> => {
  if (configuration !== null) return configuration;
  const auth = env.OIDC_WEB_CLIENT_SECRET
    ? client.ClientSecretBasic(env.OIDC_WEB_CLIENT_SECRET)
    : client.None();
  const insecure = new URL(env.OIDC_ISSUER_URL).protocol === 'http:';
  const pending = client.discovery(
    new URL(env.OIDC_ISSUER_URL),
    env.OIDC_WEB_CLIENT_ID,
    undefined,
    auth,
    // Plain http is allowed only for a local issuer; prod config requires https.
    insecure ? { execute: [client.allowInsecureRequests] } : undefined,
  );
  pending.catch(() => {
    if (configuration === pending) configuration = null;
  });
  configuration = pending;
  return pending;
};

export const redirectUri = (env: OidcSettings) =>
  callbackUrl(env, AUTH_ROUTES.callback);

export const beginSignIn = async (
  env: OidcSettings,
  options: { returnTo: string; loginHint?: string },
): Promise<{ url: URL; transaction: AuthTransaction }> => {
  const codeVerifier = client.randomPKCECodeVerifier();
  const transaction: AuthTransaction = {
    codeVerifier,
    state: client.randomState(),
    nonce: client.randomNonce(),
    returnTo: options.returnTo,
  };
  const url = client.buildAuthorizationUrl(await config(env), {
    redirect_uri: redirectUri(env),
    scope: env.OIDC_WEB_SCOPES,
    code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: 'S256',
    state: transaction.state,
    nonce: transaction.nonce,
    ...(options.loginHint ? { login_hint: options.loginHint } : {}),
  });
  return { url, transaction };
};

const userOf = (
  claims: Record<string, unknown>,
  env: OidcSettings,
): SessionUser | null => {
  const mapped = principalFromClaims(claims, {
    orgClaim: env.OIDC_ORG_CLAIM,
    rolesClaim: env.OIDC_ROLES_CLAIM,
    nameClaim: env.OIDC_NAME_CLAIM,
    orgNameClaim: env.OIDC_ORG_NAME_CLAIM,
  });
  if (!mapped.ok) return null;
  const { principal } = mapped;
  return {
    sub: principal.userId,
    name: principal.displayName ?? principal.userId,
    orgId: principal.orgId,
    ...(principal.orgName ? { orgName: principal.orgName } : {}),
    roles: [...principal.roles],
  };
};

const sessionFrom = (
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  user: SessionUser,
  previous?: WebSession,
): WebSession => {
  const now = Math.floor(Date.now() / 1_000);
  const refreshToken = tokens.refresh_token ?? previous?.refreshToken;
  const idToken = tokens.id_token ?? previous?.idToken;
  return {
    user,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: now + (tokens.expiresIn() ?? 0),
    ...(refreshToken ? { refreshToken } : {}),
    ...(idToken ? { idToken } : {}),
  };
};

/** Verifies state, PKCE, nonce, issuer and the ID token, then builds the session. */
export const completeSignIn = async (
  env: OidcSettings,
  currentUrl: URL,
  transaction: AuthTransaction,
): Promise<WebSession | null> => {
  const tokens = await client.authorizationCodeGrant(
    await config(env),
    currentUrl,
    {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    },
  );
  const claims = tokens.claims();
  const user = claims ? userOf(claims, env) : null;
  return user ? sessionFrom(tokens, user) : null;
};

export const refreshSession = async (
  env: OidcSettings,
  session: WebSession,
): Promise<WebSession | null> => {
  if (!session.refreshToken) return null;
  const tokens = await client.refreshTokenGrant(
    await config(env),
    session.refreshToken,
  );
  const claims = tokens.claims();
  const user = (claims ? userOf(claims, env) : null) ?? session.user;
  return sessionFrom(tokens, user, session);
};

export const endSessionUrl = async (
  env: OidcSettings,
  idToken: string | undefined,
  postLogout: string,
): Promise<URL | null> => {
  const cfg = await config(env);
  if (!cfg.serverMetadata().end_session_endpoint) return null;
  return client.buildEndSessionUrl(cfg, {
    post_logout_redirect_uri: postLogout,
    client_id: env.OIDC_WEB_CLIENT_ID,
    ...(idToken ? { id_token_hint: idToken } : {}),
  });
};
