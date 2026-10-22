import { loadEnv, WebServerEnv } from '@matchiq/config';
import { AUTH_COOKIES } from '@/constants/auth';

let cached: WebServerEnv | null = null;

/** Validated on first use and fails fast; server-only (route handlers, server components). */
export const webServerEnv = (): WebServerEnv => {
  cached ??= loadEnv(WebServerEnv, process.env);
  return cached;
};

export type OidcSettings = WebServerEnv & {
  readonly OIDC_ISSUER_URL: string;
  readonly OIDC_WEB_CLIENT_ID: string;
  readonly WEB_SESSION_SECRET: string;
};

/** Null when sign-in is not configured; the app then runs as the public demo only. */
export const oidcSettings = (): OidcSettings | null => {
  const env = webServerEnv();
  const { OIDC_ISSUER_URL, OIDC_WEB_CLIENT_ID, WEB_SESSION_SECRET } = env;
  if (!OIDC_ISSUER_URL || !OIDC_WEB_CLIENT_ID || !WEB_SESSION_SECRET)
    return null;
  return { ...env, OIDC_ISSUER_URL, OIDC_WEB_CLIENT_ID, WEB_SESSION_SECRET };
};

export const isSecureOrigin = (env: WebServerEnv): boolean =>
  new URL(env.WEB_PUBLIC_URL).protocol === 'https:';

export const cookieName = (env: WebServerEnv, base: string): string =>
  isSecureOrigin(env) ? `${AUTH_COOKIES.securePrefix}${base}` : base;

export const callbackUrl = (env: WebServerEnv, path: string): string =>
  new URL(path, env.WEB_PUBLIC_URL).toString();
