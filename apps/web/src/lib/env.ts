import { WebPublicEnv } from '@matchiq/config';
import { AUTH_ROUTES } from '@/constants/auth';
import { isSignedIn } from '@/lib/auth/session-store';

/**
 * `NEXT_PUBLIC_*` values are inlined at build time, so each must be read by
 * its literal name rather than by iterating `process.env`.
 */
export const PUBLIC_ENV = WebPublicEnv.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  NEXT_PUBLIC_OIDC_ISSUER_URL: process.env.NEXT_PUBLIC_OIDC_ISSUER_URL,
});

const TRAILING_SLASHES = /\/+$/;

/** The API itself; signed-out requests and ticketed streams go here directly. */
export const publicApiUrl = (path: string): string =>
  `${PUBLIC_ENV.NEXT_PUBLIC_API_BASE_URL.replace(TRAILING_SLASHES, '')}${path}`;

/** Signed-in requests go through the same-origin BFF, which adds the bearer token. */
export const apiUrl = (path: string): string =>
  isSignedIn() ? `${AUTH_ROUTES.bff}${path}` : publicApiUrl(path);
