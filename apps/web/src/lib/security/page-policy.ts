import { PUBLIC_ENV } from '@/lib/env';
import { buildContentSecurityPolicy, createNonce, originOf } from './csp';

export interface PagePolicy {
  readonly nonce: string;
  readonly policy: string;
}

/**
 * The CSP for one page request. `OIDC_ISSUER_URL` is read at runtime so the
 * same image can point at Keycloak locally or Entra ID in Azure; its origin is
 * allowed for sign-in redirects (`form-action`) and token calls (`connect-src`).
 */
export const createPagePolicy = (): PagePolicy => {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    apiOrigin: originOf(PUBLIC_ENV.NEXT_PUBLIC_API_BASE_URL),
    issuerOrigin: originOf(process.env.OIDC_ISSUER_URL),
    development: process.env.NODE_ENV === 'development',
  });
  return { nonce, policy };
};
