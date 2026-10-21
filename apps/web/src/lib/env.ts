import { WebPublicEnv } from '@matchiq/config';

/**
 * `NEXT_PUBLIC_*` values are inlined at build time, so each must be read by
 * its literal name rather than by iterating `process.env`.
 */
export const PUBLIC_ENV = WebPublicEnv.parse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
});

const TRAILING_SLASHES = /\/+$/;

export const apiUrl = (path: string): string =>
  `${PUBLIC_ENV.NEXT_PUBLIC_API_BASE_URL.replace(TRAILING_SLASHES, '')}${path}`;
