import type { AnyRole } from '@matchiq/access';

export const AUTH_ROUTES = {
  signInPage: '/sign-in',
  signIn: '/auth/sign-in',
  callback: '/auth/callback',
  signOut: '/auth/sign-out',
  session: '/auth/session',
  /** Same-origin API proxy for signed-in users; maps to `API_INTERNAL_BASE_URL`. */
  bff: '/bff',
} as const;

export const AUTH_QUERY = {
  returnTo: 'returnTo',
  loginHint: 'login_hint',
  error: 'error',
} as const;

export const AUTH_COOKIES = {
  session: 'mq_session',
  transaction: 'mq_auth',
  /** `__Host-` requires Secure, Path=/ and no Domain, so only on https. */
  securePrefix: '__Host-',
} as const;

export const AUTH_LIMITS = {
  transactionMaxAgeSeconds: 600,
  /** Refresh this long before the access token expires. */
  refreshLeewaySeconds: 30,
  /** A rotated session is reused this long by requests still carrying the old refresh token. */
  refreshGraceMs: 30_000,
  refreshGraceEntriesMax: 1_000,
  /** Browsers cap a cookie near 4 KiB; sessions are split into chunks below it. */
  cookieChunkBytes: 3_800,
  cookieChunksMax: 4,
  apiNotifyTimeoutMs: 3_000,
  bffTimeoutMs: 15_000,
} as const;

/** Token-endpoint errors that end a session; anything else is treated as transient. */
export const REFRESH_REJECTIONS: ReadonlySet<string> = new Set([
  'invalid_grant',
  'invalid_token',
]);
export const NO_REFRESH_TOKEN = 'no_refresh_token';

export const AUTH_ERRORS = {
  callback: 'callback',
  unavailable: 'unavailable',
  expired: 'expired',
} as const;

export const SAFE_RETURN_PATH = /^\/(?!\/)[^\s\\]*$/;
export const LOGIN_HINT_PATTERN = /^[A-Za-z0-9._@-]{1,128}$/;

/** Headers the BFF forwards to the API in each direction. */
export const BFF_HEADERS = {
  request: [
    'accept',
    'content-type',
    'idempotency-key',
    'last-event-id',
    'x-request-id',
  ],
  response: [
    'content-type',
    'retry-after',
    'idempotent-replayed',
    'x-request-id',
    'cache-control',
  ],
} as const;

export const BFF = {
  status: {
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    badGateway: 502,
    unavailable: 503,
  },
  titles: {
    unconfigured: 'Sign-in is not configured',
    notFound: 'Not found',
    crossOrigin: 'Cross-origin request refused',
    signInAgain: 'Sign in again',
    unreachable: 'The MatchIQ API could not be reached',
    idpUnreachable:
      'The identity provider could not be reached. Your session is kept; try again shortly.',
  },
  dotSegments: ['.', '..'],
  problemType: (status: number) => `urn:matchiq:problem:bff-${status}`,
  contentType: 'content-type',
  problemMediaType: 'application/problem+json',
  authorization: 'authorization',
  bearer: 'Bearer ',
} as const;

export const ROLE_LABELS: Readonly<Record<AnyRole, string>> = {
  'platform-operator': 'Platform operator',
  'tenant-owner': 'Tenant owner',
  producer: 'Producer',
  analyst: 'Analyst',
  developer: 'Developer',
  viewer: 'Viewer',
  anonymous: 'Public demo',
};

/** Seeded local Keycloak accounts (docs/security/IDENTITY_AND_ACCESS.md). */
export const DEMO_ACCOUNTS = [
  { username: 'harbour.producer', role: 'producer', org: 'Harbour Media' },
  { username: 'harbour.viewer', role: 'viewer', org: 'Harbour Media' },
  { username: 'harbour.analyst', role: 'analyst', org: 'Harbour Media' },
  { username: 'harbour.owner', role: 'tenant-owner', org: 'Harbour Media' },
  { username: 'northbank.producer', role: 'producer', org: 'Northbank Sports' },
] as const satisfies readonly {
  username: string;
  role: AnyRole;
  org: string;
}[];

export const DEMO_PASSWORD = 'matchiq-dev-only';

export const AUTH_COPY = {
  signIn: 'Sign in',
  signOut: 'Sign out',
  signInTitle: 'Sign in to MatchIQ',
  signInLead:
    'Use your organisation account. Your role decides which controls you see.',
  continueSso: 'Continue with single sign-on',
  ssoUnavailable:
    'Single sign-on is not configured for this environment. The public demo stays available without signing in.',
  browseAnonymously: 'Continue to the public demo',
  demoTitle: 'Demo accounts',
  demoBadge: 'Development only',
  demoLead: (password: string) =>
    `Local Keycloak accounts for trying role-based access. Each opens the normal sign-in page; the password is ${password}.`,
  demoAccount: (role: string, org: string) => `${role} · ${org}`,
  userMenu: 'Account',
  signedInAs: 'Signed in as',
  organisation: 'Organisation',
  role: 'Role',
  publicDemo: 'Public demo',
  errors: {
    callback: 'Sign-in did not complete. Please try again.',
    unavailable: 'The identity provider could not be reached.',
    expired: 'Your session expired. Sign in again to continue.',
  },
  sessionExpiredAction: 'Sign in again',
  forbiddenTitle: 'You do not have access to this',
  forbiddenBody: (role: string) =>
    `Your role (${role}) does not include this permission. Ask a tenant owner if you need it.`,
  forbiddenAction: 'Back to fixtures',
  requiresRole: (roles: string) => `Requires ${roles}`,
} as const;
