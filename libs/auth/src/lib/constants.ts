/** Asymmetric only: an HMAC or `none` token signed with a guessed key is rejected. */
export const ACCESS_TOKEN_ALGORITHMS = ['RS256', 'PS256', 'ES256'] as const;

export const STREAM_TICKET = {
  algorithm: 'HS256',
  issuer: 'matchiq-api',
  audience: 'matchiq-stream',
  queryParam: 'ticket',
} as const;

export const OIDC = {
  discoveryPath: '/.well-known/openid-configuration',
  discoveryTimeoutMs: 5_000,
  jwksTimeoutMs: 5_000,
  jwksCooldownMs: 30_000,
  jwksCacheMaxAgeMs: 600_000,
  /** Keycloak marks access tokens `typ: Bearer`; ID and refresh tokens differ. */
  accessTokenType: 'Bearer',
  typeClaim: 'typ',
  requiredClaims: ['sub', 'exp', 'iat'],
} as const;

export const HEADERS = {
  authorization: 'authorization',
  wwwAuthenticate: 'WWW-Authenticate',
} as const;

export const BEARER_PREFIX = 'bearer ';
export const TRAILING_SLASHES = /\/+$/;
export const REALM = 'matchiq';

/** RFC 6750 §3.1 error codes. */
export const BEARER_ERRORS = {
  invalidToken: 'invalid_token',
  insufficientScope: 'insufficient_scope',
} as const;

export const AUTH_FAILURES = {
  missing: 'missing',
  malformed: 'malformed',
  expired: 'expired',
  notYetValid: 'not-yet-valid',
  wrongIssuer: 'wrong-issuer',
  wrongAudience: 'wrong-audience',
  badSignature: 'bad-signature',
  unknownKey: 'unknown-key',
  algorithm: 'algorithm-not-allowed',
  wrongTokenType: 'wrong-token-type',
  claims: 'invalid-claims',
  ticketScope: 'ticket-not-for-this-stream',
  operatorKey: 'operator-key-invalid',
  unconfigured: 'bearer-tokens-not-accepted',
} as const;

export type AuthFailureReason =
  (typeof AUTH_FAILURES)[keyof typeof AUTH_FAILURES];

export const FAILURE_DETAILS: Readonly<Record<AuthFailureReason, string>> = {
  missing: 'Send Authorization: Bearer <access token>',
  malformed: 'The bearer token is not a well-formed JWT',
  expired: 'The access token has expired',
  'not-yet-valid': 'The access token is not valid yet',
  'wrong-issuer': 'The access token was issued by an untrusted issuer',
  'wrong-audience': 'The access token is not intended for this API',
  'bad-signature': 'The access token signature is invalid',
  'unknown-key': 'The access token was signed with an unknown key',
  'algorithm-not-allowed': 'The access token algorithm is not accepted',
  'wrong-token-type': 'Only access tokens are accepted',
  'invalid-claims': 'The access token carries no organisation or known role',
  'ticket-not-for-this-stream':
    'The stream ticket is not valid for this stream',
  'operator-key-invalid': 'The operator key is not valid',
  'bearer-tokens-not-accepted': 'This API is not configured for bearer tokens',
};

export const PROBLEMS = {
  unauthorized: { title: 'Authentication required', slug: 'unauthorized' },
  forbidden: {
    title: 'You do not have permission for this action',
    slug: 'forbidden',
  },
  undeclared: {
    title: 'This route declares no permission',
    slug: 'forbidden',
  },
  authUnavailable: {
    title: 'The identity provider is unreachable',
    slug: 'auth-unavailable',
  },
} as const;

export const FORBIDDEN_DETAIL = (permission: string) =>
  `Requires the ${permission} permission`;

export const METADATA = {
  permission: 'matchiq:required-permission',
  streamTicket: 'matchiq:accepts-stream-ticket',
} as const;

/** Declared instead of a permission: any authenticated caller, anonymous demo included. */
export const ANY_PRINCIPAL = 'principal:any';

/** Express request property holding the resolved principal. */
export const PRINCIPAL_PROPERTY = 'matchiqPrincipal';
