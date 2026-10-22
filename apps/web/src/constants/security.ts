export const CSP_HEADER = 'Content-Security-Policy';
/** Request header that carries the per-request nonce to server components. */
export const NONCE_HEADER = 'x-nonce';
export const NONCE_BYTES = 16;
export const HASH_ALGORITHM = 'sha256';

export const CSP_KEYWORDS = {
  self: "'self'",
  none: "'none'",
  strictDynamic: "'strict-dynamic'",
  unsafeEval: "'unsafe-eval'",
  unsafeInline: "'unsafe-inline'",
  data: 'data:',
  blob: 'blob:',
  ws: 'ws:',
  wss: 'wss:',
} as const;

export const CSP_FLAGS = {
  upgradeInsecureRequests: 'upgrade-insecure-requests',
} as const;

export const HTTPS_PROTOCOL = 'https:';
