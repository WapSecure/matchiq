/**
 * A minimal OpenID Connect provider for e2e runs without Keycloak:
 * discovery, JWKS, Authorization Code + PKCE (S256 only), refresh and
 * end-session. Its login form uses Keycloak's field ids so one spec drives
 * both. Test-only; started by playwright.config.mts.
 */
import { createHash, randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import {
  OIDC_API_AUDIENCE,
  OIDC_CLIENT_ID,
  OIDC_PASSWORD,
  OIDC_USERS,
  type OidcUser,
} from './oidc-users.ts';

const PORT = Number(process.env['E2E_OIDC_PORT'] ?? 4387);
const ISSUER = `http://127.0.0.1:${PORT}`;
const TTL_SECONDS = 300;
const KID = 'e2e-key';

type Grant = {
  user: OidcUser;
  nonce: string;
  challenge: string;
  redirectUri: string;
};

const keys = generateKeyPair('RS256', { extractable: true });
const jwks = keys.then(async ({ publicKey }) => ({
  keys: [{ ...(await exportJWK(publicKey)), kid: KID, alg: 'RS256' }],
}));
const codes = new Map<string, Grant>();
const refreshTokens = new Map<string, OidcUser>();

const discovery = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/authorize`,
  token_endpoint: `${ISSUER}/token`,
  jwks_uri: `${ISSUER}/jwks`,
  end_session_endpoint: `${ISSUER}/logout`,
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
};

const send = (
  res: ServerResponse,
  status: number,
  body: string,
  type = 'application/json',
) => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

const redirect = (res: ServerResponse, location: string) => {
  res.writeHead(302, { location });
  res.end();
};

const readForm = async (req: IncomingMessage): Promise<URLSearchParams> => {
  let body = '';
  for await (const chunk of req) body += String(chunk);
  return new URLSearchParams(body);
};

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const loginPage = (params: URLSearchParams, error = '') => {
  const hidden = [...params]
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escape(k)}" value="${escape(v)}">`,
    )
    .join('');
  const hint = escape(params.get('login_hint') ?? '');
  return `<!doctype html><html lang="en"><head><title>Sign in to the e2e issuer</title></head><body><main>
<h1>Sign in (e2e test issuer)</h1>${error ? `<p role="alert">${error}</p>` : ''}
<form method="post" action="/authorize">${hidden}
<label for="username">Username</label><input id="username" name="username" value="${hint}" autocomplete="username">
<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password">
<button id="kc-login" type="submit">Sign In</button></form></main></body></html>`;
};

const sign = async (claims: Record<string, unknown>, audience: string) => {
  const now = Math.floor(Date.now() / 1_000);
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: KID })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .setJti(randomUUID())
    .sign((await keys).privateKey);
};

const userClaims = (user: OidcUser) => ({
  sub: `e2e-${user.username}`,
  name: user.name,
  preferred_username: user.username,
  org: user.org,
  org_name: user.orgName,
  roles: [user.role],
});

const tokensFor = async (user: OidcUser, nonce?: string) => {
  const refresh = randomUUID();
  refreshTokens.set(refresh, user);
  return JSON.stringify({
    token_type: 'Bearer',
    expires_in: TTL_SECONDS,
    access_token: await sign(
      { ...userClaims(user), typ: 'Bearer', scope: 'openid profile' },
      OIDC_API_AUDIENCE,
    ),
    id_token: await sign({ ...userClaims(user), nonce }, OIDC_CLIENT_ID),
    refresh_token: refresh,
  });
};

const authorize = async (req: IncomingMessage, res: ServerResponse) => {
  const form = await readForm(req);
  const user = OIDC_USERS.find((u) => u.username === form.get('username'));
  if (!user || form.get('password') !== OIDC_PASSWORD) {
    form.delete('username');
    form.delete('password');
    return send(
      res,
      200,
      loginPage(form, 'Invalid username or password.'),
      'text/html',
    );
  }
  const code = randomUUID();
  codes.set(code, {
    user,
    nonce: form.get('nonce') ?? '',
    challenge: form.get('code_challenge') ?? '',
    redirectUri: form.get('redirect_uri') ?? '',
  });
  const target = new URL(form.get('redirect_uri') ?? '');
  target.searchParams.set('code', code);
  target.searchParams.set('state', form.get('state') ?? '');
  return redirect(res, target.toString());
};

const pkceMatches = (verifier: string, challenge: string) =>
  createHash('sha256').update(verifier).digest('base64url') === challenge;

const token = async (req: IncomingMessage, res: ServerResponse) => {
  const form = await readForm(req);
  if (form.get('grant_type') === 'refresh_token') {
    const user = refreshTokens.get(form.get('refresh_token') ?? '');
    return user
      ? send(res, 200, await tokensFor(user))
      : send(res, 400, JSON.stringify({ error: 'invalid_grant' }));
  }
  const grant = codes.get(form.get('code') ?? '');
  codes.delete(form.get('code') ?? '');
  const valid =
    grant !== undefined &&
    grant.redirectUri === form.get('redirect_uri') &&
    pkceMatches(form.get('code_verifier') ?? '', grant.challenge);
  if (!valid) return send(res, 400, JSON.stringify({ error: 'invalid_grant' }));
  return send(res, 200, await tokensFor(grant.user, grant.nonce));
};

const route = async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', ISSUER);
  const key = `${req.method} ${url.pathname}`;
  if (key === 'GET /.well-known/openid-configuration')
    return send(res, 200, JSON.stringify(discovery));
  if (key === 'GET /jwks') return send(res, 200, JSON.stringify(await jwks));
  if (key === 'GET /authorize')
    return send(res, 200, loginPage(url.searchParams), 'text/html');
  if (key === 'POST /authorize') return authorize(req, res);
  if (key === 'POST /token') return token(req, res);
  if (key === 'GET /logout')
    return redirect(
      res,
      url.searchParams.get('post_logout_redirect_uri') ?? '/',
    );
  return send(res, 404, '{}');
};

createServer((req, res) => {
  route(req, res).catch(() => send(res, 500, '{}'));
}).listen(PORT, '127.0.0.1');
