/** Mirrors the seeded Keycloak realm (infra/keycloak/matchiq-realm.json). Test-only. */
export const OIDC_PASSWORD = 'matchiq-dev-only';

export type OidcUser = {
  readonly username: string;
  readonly name: string;
  readonly org: string;
  readonly orgName: string;
  readonly role: string;
  /** Access-token lifetime override; only the bundled test issuer honours it. */
  readonly ttlSeconds?: number;
};

export const OIDC_USERS: readonly OidcUser[] = [
  {
    username: 'harbour.producer',
    name: 'Pat Producer',
    org: 'org_demo',
    orgName: 'Harbour Media (synthetic)',
    role: 'producer',
  },
  {
    username: 'harbour.viewer',
    name: 'Vic Viewer',
    org: 'org_demo',
    orgName: 'Harbour Media (synthetic)',
    role: 'viewer',
  },
  {
    username: 'harbour.analyst',
    name: 'Ana Analyst',
    org: 'org_demo',
    orgName: 'Harbour Media (synthetic)',
    role: 'analyst',
  },
  {
    username: 'harbour.owner',
    name: 'Hana Owner',
    org: 'org_demo',
    orgName: 'Harbour Media (synthetic)',
    role: 'tenant-owner',
  },
  {
    username: 'northbank.producer',
    name: 'Nia Producer',
    org: 'org_northbank',
    orgName: 'Northbank Sports Network (synthetic)',
    role: 'producer',
  },
  {
    username: 'platform.operator',
    name: 'Olu Operator',
    org: 'org_platform',
    orgName: 'MatchIQ Platform (synthetic)',
    role: 'platform-operator',
  },
];

/** A producer whose access token outlives the web's refresh leeway by seconds. */
export const SHORT_SESSION_USER: OidcUser = {
  username: 'short.session',
  name: 'Sam Short',
  org: 'org_demo',
  orgName: 'Harbour Media (synthetic)',
  role: 'producer',
  ttlSeconds: 34,
};

/** The bundled test issuer also knows users that are not in the Keycloak realm. */
export const TEST_ISSUER_USERS: readonly OidcUser[] = [
  ...OIDC_USERS,
  SHORT_SESSION_USER,
];

export const OIDC_CLIENT_ID = 'matchiq-web';
export const OIDC_API_AUDIENCE = 'matchiq-api';
