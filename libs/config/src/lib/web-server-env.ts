import { z } from 'zod';
import {
  AUTH_DEFAULTS,
  AUTH_ENV_MESSAGES,
  DEFAULT_WEB_URL,
  HTTPS_PROTOCOL,
  PROD_ENVIRONMENT,
} from './auth-constants.js';
import { OidcClaimFields } from './auth-env.js';
import { DEFAULT_URLS } from './constants.js';
import {
  boundedInt,
  optionalSecret,
  optionalString,
  optionalUrl,
} from './fields.js';
import { AppEnvironment } from './environment.js';

/**
 * Server-only settings for the web app's OIDC relying party and BFF
 * (ADR-0015). Never `NEXT_PUBLIC_*`: none of these reach the browser.
 */
const WebServerObject = z.object({
  APP_ENV: AppEnvironment.default('local'),
  OIDC_ISSUER_URL: optionalUrl,
  OIDC_WEB_CLIENT_ID: optionalString,
  /** Unset for the public dev client; set for a confidential registration. */
  OIDC_WEB_CLIENT_SECRET: optionalString,
  OIDC_WEB_SCOPES: z.string().min(1).default(AUTH_DEFAULTS.webScopes),
  ...OidcClaimFields,
  /** The browser-facing origin; the redirect URI is `<this>/auth/callback`. */
  WEB_PUBLIC_URL: z.url().default(DEFAULT_WEB_URL),
  WEB_SESSION_SECRET: optionalSecret,
  WEB_SESSION_MAX_AGE_SECONDS: boundedInt(
    AUTH_DEFAULTS.webSessionMinAgeSeconds,
    AUTH_DEFAULTS.webSessionMaxAllowedSeconds,
    AUTH_DEFAULTS.webSessionMaxAgeSeconds,
  ),
  /** Where the BFF reaches the API from the web server. */
  API_INTERNAL_BASE_URL: z.url().default(DEFAULT_URLS.apiBase),
});

type WebServerShape = z.infer<typeof WebServerObject>;

const checkWebServerEnv = (env: WebServerShape, ctx: z.RefinementCtx) => {
  const parts = [
    env.OIDC_ISSUER_URL,
    env.OIDC_WEB_CLIENT_ID,
    env.WEB_SESSION_SECRET,
  ];
  const set = parts.filter((p) => p !== undefined).length;
  if (set !== 0 && set !== parts.length)
    ctx.addIssue({
      code: 'custom',
      path: ['OIDC_WEB_CLIENT_ID'],
      message: AUTH_ENV_MESSAGES.webOidcIncomplete,
    });
  if (env.APP_ENV !== PROD_ENVIRONMENT) return;
  for (const key of ['OIDC_ISSUER_URL', 'WEB_PUBLIC_URL'] as const) {
    const value = env[key];
    if (value !== undefined && new URL(value).protocol !== HTTPS_PROTOCOL)
      ctx.addIssue({
        code: 'custom',
        path: [key],
        message: AUTH_ENV_MESSAGES.httpsInProd,
      });
  }
};

export const WebServerEnv = WebServerObject.superRefine(checkWebServerEnv);
export type WebServerEnv = z.infer<typeof WebServerEnv>;
