import {
  type ClaimMapping,
  type Principal,
  principalFromClaims,
} from '@matchiq/access';
import {
  createRemoteJWKSet,
  errors,
  type JWTPayload,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import {
  ACCESS_TOKEN_ALGORITHMS,
  AUTH_FAILURES,
  type AuthFailureReason,
  OIDC,
  TRAILING_SLASHES,
} from './constants';

export interface AccessTokenVerifierOptions {
  readonly issuer: string;
  readonly audience: string;
  /** Skips discovery; use when the JWKS host differs from the issuer host. */
  readonly jwksUrl?: string;
  readonly clockSkewSeconds: number;
  readonly mapping: ClaimMapping;
  readonly fetchImpl?: typeof fetch;
}

export type VerifyOutcome =
  | { readonly ok: true; readonly principal: Principal }
  | { readonly ok: false; readonly reason: AuthFailureReason };

/** The identity provider or its keys could not be reached: a 503, not a 401. */
export class AuthUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

const CLAIM_FAILURES: Readonly<Record<string, AuthFailureReason>> = {
  iss: AUTH_FAILURES.wrongIssuer,
  aud: AUTH_FAILURES.wrongAudience,
  nbf: AUTH_FAILURES.notYetValid,
};

const reasonOf = (error: unknown): AuthFailureReason | null => {
  if (error instanceof errors.JWTExpired) return AUTH_FAILURES.expired;
  if (error instanceof errors.JWTClaimValidationFailed)
    return CLAIM_FAILURES[error.claim] ?? AUTH_FAILURES.claims;
  if (error instanceof errors.JWSSignatureVerificationFailed)
    return AUTH_FAILURES.badSignature;
  if (error instanceof errors.JWKSNoMatchingKey)
    return AUTH_FAILURES.unknownKey;
  if (error instanceof errors.JOSEAlgNotAllowed) return AUTH_FAILURES.algorithm;
  if (
    error instanceof errors.JWSInvalid ||
    error instanceof errors.JWTInvalid ||
    error instanceof errors.JOSENotSupported
  )
    return AUTH_FAILURES.malformed;
  return null;
};

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Verifies OIDC access tokens against the issuer's JWKS. jose caches the key
 * set, refetches on an unknown `kid` at most once per cooldown, and bounds
 * every fetch with a timeout.
 */
export class AccessTokenVerifier {
  private keys: Promise<JWTVerifyGetKey> | null = null;

  constructor(private readonly options: AccessTokenVerifierOptions) {}

  async verify(token: string): Promise<VerifyOutcome> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, await this.keySet(), {
        issuer: this.options.issuer,
        audience: this.options.audience,
        clockTolerance: this.options.clockSkewSeconds,
        algorithms: [...ACCESS_TOKEN_ALGORITHMS],
        requiredClaims: [...OIDC.requiredClaims],
      }));
    } catch (error) {
      const reason = reasonOf(error);
      if (reason === null) throw new AuthUnavailableError(describe(error));
      return { ok: false, reason };
    }
    const type = payload[OIDC.typeClaim];
    if (type !== undefined && type !== OIDC.accessTokenType)
      return { ok: false, reason: AUTH_FAILURES.wrongTokenType };
    const mapped = principalFromClaims(payload, this.options.mapping);
    return mapped.ok
      ? { ok: true, principal: mapped.principal }
      : { ok: false, reason: AUTH_FAILURES.claims };
  }

  private keySet(): Promise<JWTVerifyGetKey> {
    if (this.keys !== null) return this.keys;
    const pending = this.resolveJwksUrl().then((url) =>
      createRemoteJWKSet(new URL(url), {
        timeoutDuration: OIDC.jwksTimeoutMs,
        cooldownDuration: OIDC.jwksCooldownMs,
        cacheMaxAge: OIDC.jwksCacheMaxAgeMs,
      }),
    );
    // A failed discovery is retried on the next request rather than cached.
    pending.catch(() => {
      if (this.keys === pending) this.keys = null;
    });
    this.keys = pending;
    return pending;
  }

  private async resolveJwksUrl(): Promise<string> {
    if (this.options.jwksUrl) return this.options.jwksUrl;
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const url = `${this.options.issuer.replace(TRAILING_SLASHES, '')}${OIDC.discoveryPath}`;
    let doc: { issuer?: unknown; jwks_uri?: unknown };
    try {
      const res = await fetchImpl(url, {
        signal: AbortSignal.timeout(OIDC.discoveryTimeoutMs),
      });
      if (!res.ok) throw new Error(`discovery answered ${res.status}`);
      doc = (await res.json()) as typeof doc;
    } catch (error) {
      throw new AuthUnavailableError(describe(error));
    }
    if (doc.issuer !== this.options.issuer || typeof doc.jwks_uri !== 'string')
      throw new AuthUnavailableError('discovery document does not match');
    return doc.jwks_uri;
  }
}
