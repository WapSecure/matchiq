import { PUBLIC_ENV } from '@/lib/env';
import { buildContentSecurityPolicy, createNonce, originOf } from './csp';

export interface PagePolicy {
  readonly nonce: string;
  readonly policy: string;
}

/**
 * The CSP for one page request. The issuer origin is the one the browser
 * reaches (`NEXT_PUBLIC_OIDC_ISSUER_URL`, e.g. Keycloak on :8180), falling back
 * to the server's `OIDC_ISSUER_URL`, read at runtime. It is allowed for sign-in
 * and sign-out redirects (`form-action`) and token calls (`connect-src`).
 */
export const createPagePolicy = (): PagePolicy => {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    apiOrigin: originOf(PUBLIC_ENV.NEXT_PUBLIC_API_BASE_URL),
    issuerOrigin: originOf(
      PUBLIC_ENV.NEXT_PUBLIC_OIDC_ISSUER_URL ?? process.env.OIDC_ISSUER_URL,
    ),
    development: process.env.NODE_ENV === 'development',
  });
  return { nonce, policy };
};
