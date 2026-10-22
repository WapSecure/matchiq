import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AnyRole } from '@matchiq/access';
import {
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JWK,
  type JWTPayload,
  SignJWT,
} from 'jose';

export const TEST_AUDIENCE = 'matchiq-api';
const REALM_PATH = '/realms/test';
const JWKS_PATH = '/protocol/openid-connect/certs';
const DISCOVERY_PATH = '/.well-known/openid-configuration';
const ALG = 'RS256';
const KID = 'test-key-1';
const DEFAULT_TTL_SECONDS = 300;

export interface MintOptions {
  readonly claims?: JWTPayload;
  /** Seconds from now; negative mints an expired token. */
  readonly expiresIn?: number;
  readonly notBefore?: number;
  readonly audience?: string | string[];
  readonly issuer?: string;
  /** Sign with a key the JWKS does not publish (a tampered or foreign token). */
  readonly rogueKey?: boolean;
  readonly kid?: string;
}

export interface TestIssuer {
  readonly issuer: string;
  readonly audience: string;
  readonly jwksUrl: string;
  /** JWKS and discovery requests served so far. */
  readonly requests: { jwks: number; discovery: number };
  mint(options?: MintOptions): Promise<string>;
  /** A token for a seeded-style user: `sub`, `org`, `roles`, `name`. */
  tokenFor(
    roles: readonly AnyRole[],
    orgId: string,
    options?: MintOptions,
  ): Promise<string>;
  close(): Promise<void>;
}

const now = (): number => Math.floor(Date.now() / 1_000);

const keyPair = () => generateKeyPair(ALG, { extractable: true });

/** A local OIDC issuer (discovery + JWKS) for tests; never used outside them. */
export const startTestIssuer = async (
  audience: string = TEST_AUDIENCE,
): Promise<TestIssuer> => {
  const primary = await keyPair();
  const rogue = await keyPair();
  const jwk: JWK = {
    ...(await exportJWK(primary.publicKey)),
    kid: KID,
    alg: ALG,
    use: 'sig',
  };
  const requests = { jwks: 0, discovery: 0 };
  let base = '';
  const server: Server = createServer((req, res) => {
    const respond = (body: unknown) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url === `${REALM_PATH}${DISCOVERY_PATH}`) {
      requests.discovery += 1;
      return respond({
        issuer: `${base}${REALM_PATH}`,
        jwks_uri: `${base}${REALM_PATH}${JWKS_PATH}`,
      });
    }
    if (req.url === `${REALM_PATH}${JWKS_PATH}`) {
      requests.jwks += 1;
      return respond({ keys: [jwk] });
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const issuer = `${base}${REALM_PATH}`;

  const mint = (options: MintOptions = {}): Promise<string> => {
    const issuedAt = now();
    const signer: CryptoKey = options.rogueKey
      ? rogue.privateKey
      : primary.privateKey;
    const jwt = new SignJWT({ typ: 'Bearer', ...options.claims })
      .setProtectedHeader({ alg: ALG, kid: options.kid ?? KID })
      .setIssuer(options.issuer ?? issuer)
      .setAudience(options.audience ?? audience)
      .setIssuedAt(issuedAt)
      .setJti(randomUUID())
      .setExpirationTime(issuedAt + (options.expiresIn ?? DEFAULT_TTL_SECONDS));
    if (options.notBefore !== undefined)
      jwt.setNotBefore(issuedAt + options.notBefore);
    return jwt.sign(signer);
  };

  return {
    issuer,
    audience,
    jwksUrl: `${issuer}${JWKS_PATH}`,
    requests,
    mint,
    tokenFor: (roles, orgId, options = {}) =>
      mint({
        ...options,
        claims: {
          sub: `user-${orgId}-${roles.join('-')}`,
          org: orgId,
          roles: [...roles],
          name: `Test ${roles.join(' ')}`,
          ...options.claims,
        },
      }),
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
};
