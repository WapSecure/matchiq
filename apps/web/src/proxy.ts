import { type NextRequest, NextResponse } from 'next/server';
import { CSP_HEADER, NONCE_HEADER } from '@/constants/security';
import { createPagePolicy } from '@/lib/security/page-policy';

/**
 * Next reads the nonce from the request's CSP header and stamps it on its own
 * inline scripts, so pages must render per request (see the root layout).
 */
export function proxy(request: NextRequest): NextResponse {
  const { nonce, policy } = createPagePolicy();
  const headers = new Headers(request.headers);
  headers.set(NONCE_HEADER, nonce);
  headers.set(CSP_HEADER, policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(CSP_HEADER, policy);
  return response;
}

// Must be a literal: Next reads it statically. Static assets and the service
// worker (its own CSP in next.config.js) are skipped, as are prefetches.
export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
