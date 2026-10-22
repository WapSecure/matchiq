import { SignJWT, UnsecuredJWT } from 'jose';
import { startTestIssuer, type TestIssuer } from '../testing';
import {
  AccessTokenVerifier,
  AuthUnavailableError,
} from './access-token-verifier';

const MAPPING = { orgClaim: 'org', rolesClaim: 'roles', nameClaim: 'name' };

describe('AccessTokenVerifier', () => {
  let issuer: TestIssuer;
  let verifier: AccessTokenVerifier;

  beforeAll(async () => {
    issuer = await startTestIssuer();
  });
  afterAll(() => issuer.close());
  beforeEach(() => {
    verifier = new AccessTokenVerifier({
      issuer: issuer.issuer,
      audience: issuer.audience,
      clockSkewSeconds: 30,
      mapping: MAPPING,
    });
  });

  const reasonFor = async (token: string) => {
    const outcome = await verifier.verify(token);
    return outcome.ok ? 'ok' : outcome.reason;
  };

  it('accepts a valid token and maps it to a principal', async () => {
    const outcome = await verifier.verify(
      await issuer.tokenFor(['producer'], 'org_harbour'),
    );
    expect(outcome.ok && outcome.principal).toMatchObject({
      orgId: 'org_harbour',
      roles: ['producer'],
      kind: 'user',
    });
  });

  it('discovers the JWKS once and serves later tokens from the cache', async () => {
    const before = { ...issuer.requests };
    for (let i = 0; i < 5; i += 1)
      await verifier.verify(await issuer.tokenFor(['viewer'], 'org_a'));
    expect(issuer.requests.discovery - before.discovery).toBe(1);
    expect(issuer.requests.jwks - before.jwks).toBe(1);
  });

  it('rejects an expired token beyond the clock skew', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { expiresIn: -120 }),
      ),
    ).toBe('expired');
  });

  it('tolerates expiry within the clock skew', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { expiresIn: -10 }),
      ),
    ).toBe('ok');
  });

  it('rejects a token that is not valid yet', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { notBefore: 600 }),
      ),
    ).toBe('not-yet-valid');
  });

  it('rejects the wrong audience (e.g. an ID token for the web client)', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { audience: 'matchiq-web' }),
      ),
    ).toBe('wrong-audience');
  });

  it('rejects a foreign issuer', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', {
          issuer: 'https://evil.example/realms/matchiq',
        }),
      ),
    ).toBe('wrong-issuer');
  });

  it('rejects a tampered payload', async () => {
    const token = await issuer.tokenFor(['viewer'], 'org_a');
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'x', org: 'org_b', roles: ['tenant-owner'] }),
    ).toString('base64url');
    expect(await reasonFor(`${header}.${forged}.${signature}`)).toBe(
      'bad-signature',
    );
  });

  it('rejects a token signed by a key the issuer does not publish', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { rogueKey: true }),
      ),
    ).toBe('bad-signature');
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', {
          rogueKey: true,
          kid: 'other',
        }),
      ),
    ).toBe('unknown-key');
  });

  it('rejects alg none and HMAC tokens', async () => {
    const claims = { sub: 'x', org: 'org_a', roles: ['tenant-owner'] };
    const unsigned = new UnsecuredJWT(claims)
      .setIssuer(issuer.issuer)
      .setAudience(issuer.audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .encode();
    expect(await reasonFor(unsigned)).toBe('algorithm-not-allowed');
    const hmac = await new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(issuer.issuer)
      .setAudience(issuer.audience)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('a'.repeat(32)));
    expect(await reasonFor(hmac)).toBe('algorithm-not-allowed');
  });

  it('rejects ID and refresh tokens by their Keycloak typ claim', async () => {
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', { claims: { typ: 'ID' } }),
      ),
    ).toBe('wrong-token-type');
  });

  it('rejects a valid token without an organisation or a known role', async () => {
    expect(
      await reasonFor(
        await issuer.mint({ claims: { sub: 'u', roles: ['viewer'] } }),
      ),
    ).toBe('invalid-claims');
    expect(
      await reasonFor(
        await issuer.tokenFor(['viewer'], 'org_a', {
          claims: { roles: ['superadmin'] },
        }),
      ),
    ).toBe('invalid-claims');
  });

  it('rejects garbage as malformed', async () => {
    expect(await reasonFor('not.a.jwt')).toBe('malformed');
  });

  it('reports an unreachable identity provider as unavailable, then retries', async () => {
    const failing = new AccessTokenVerifier({
      issuer: 'http://127.0.0.1:9/realms/none',
      audience: 'matchiq-api',
      clockSkewSeconds: 0,
      mapping: MAPPING,
    });
    const token = await issuer.tokenFor(['viewer'], 'org_a');
    await expect(failing.verify(token)).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
    await expect(failing.verify(token)).rejects.toBeInstanceOf(
      AuthUnavailableError,
    );
  });

  it('refuses a discovery document for a different issuer', async () => {
    const spoofed = new AccessTokenVerifier({
      issuer: issuer.issuer,
      audience: issuer.audience,
      clockSkewSeconds: 0,
      mapping: MAPPING,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ issuer: 'https://evil', jwks_uri: issuer.jwksUrl }),
        ),
    });
    await expect(
      spoofed.verify(await issuer.tokenFor(['viewer'], 'org_a')),
    ).rejects.toBeInstanceOf(AuthUnavailableError);
  });

  it('uses an explicit JWKS URL without discovery', async () => {
    const direct = new AccessTokenVerifier({
      issuer: issuer.issuer,
      audience: issuer.audience,
      jwksUrl: issuer.jwksUrl,
      clockSkewSeconds: 0,
      mapping: MAPPING,
    });
    const before = issuer.requests.discovery;
    const outcome = await direct.verify(
      await issuer.tokenFor(['viewer'], 'org_a'),
    );
    expect(outcome.ok).toBe(true);
    expect(issuer.requests.discovery).toBe(before);
  });
});
