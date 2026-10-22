export const AUTH_DEFAULTS = {
  orgClaim: 'org',
  rolesClaim: 'roles',
  nameClaim: 'name',
  orgNameClaim: 'org_name',
  clockSkewSeconds: 30,
  clockSkewMaxSeconds: 300,
  streamTicketTtlSeconds: 60,
  streamTicketTtlMinSeconds: 10,
  streamTicketTtlMaxSeconds: 300,
  webScopes: 'openid profile',
  webSessionMaxAgeSeconds: 28_800,
  webSessionMinAgeSeconds: 300,
  webSessionMaxAllowedSeconds: 86_400,
} as const;

export const AUTH_ENV_MESSAGES = {
  issuerAudiencePair: 'OIDC_ISSUER_URL and OIDC_AUDIENCE must be set together',
  operatorKeyMissing:
    'is required when AUTH_OPERATOR_KEY_ENABLED=true (openssl rand -hex 32)',
  operatorKeyInProd: 'must be false when APP_ENV=prod (ADR-0015)',
  httpsInProd: 'must use https when APP_ENV=prod',
  noAccessPath:
    'set OIDC_ISSUER_URL or AUTH_ANONYMOUS_DEMO_ENABLED=true, otherwise nothing can call the API',
  webOidcIncomplete:
    'OIDC_ISSUER_URL, OIDC_WEB_CLIENT_ID and WEB_SESSION_SECRET must be set together',
} as const;

export const HTTPS_PROTOCOL = 'https:';
export const PROD_ENVIRONMENT = 'prod';
export const DEFAULT_WEB_URL = 'http://localhost:4200';
