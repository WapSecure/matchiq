import { createHash, timingSafeEqual } from 'node:crypto';
import {
  anonymousPrincipal,
  operatorKeyPrincipal,
  type Principal,
} from '@matchiq/access';
import type {
  AccessTokenVerifier,
  VerifyOutcome,
} from './access-token-verifier';
import { AUTH_FAILURES, BEARER_PREFIX } from './constants';
import type { StreamTickets } from './stream-tickets';

export interface OperatorKeyFallback {
  readonly key: string;
  readonly orgId: string;
}

export interface AuthenticatorOptions {
  /** Null when no issuer is configured: bearer JWTs are then refused. */
  readonly verifier: AccessTokenVerifier | null;
  readonly tickets: StreamTickets;
  /** Null unless the anonymous demo is enabled. */
  readonly anonymousOrgId: string | null;
  /** Null unless the dev/CI operator-key fallback is enabled. */
  readonly operatorKey: OperatorKeyFallback | null;
}

export interface Credentials {
  readonly authorization?: string;
  /** Only on routes that accept stream tickets. */
  readonly streamTicket?: {
    readonly ticket: string;
    readonly fixtureId: string;
  };
}

export type AuthResult = VerifyOutcome;

const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

/** Equal-length digests keep the comparison time independent of where keys differ. */
export const operatorKeyMatches = (
  presented: string,
  expected: string,
): boolean => timingSafeEqual(digest(presented), digest(expected));

const JWT_SEGMENTS = 3;
const looksLikeJwt = (token: string): boolean =>
  token.split('.').length === JWT_SEGMENTS;

const success = (principal: Principal): AuthResult => ({
  ok: true,
  principal,
});

/**
 * Resolves the caller. A presented credential is never downgraded to
 * anonymous when it fails; only a request with no credential at all is.
 */
export class Authenticator {
  constructor(private readonly options: AuthenticatorOptions) {}

  get acceptsBearerTokens(): boolean {
    return this.options.verifier !== null;
  }

  async authenticate(credentials: Credentials): Promise<AuthResult> {
    if (credentials.authorization !== undefined)
      return this.fromHeader(credentials.authorization);
    if (credentials.streamTicket !== undefined) {
      const { ticket, fixtureId } = credentials.streamTicket;
      return this.options.tickets.verify(ticket, fixtureId);
    }
    if (this.options.anonymousOrgId !== null)
      return success(anonymousPrincipal(this.options.anonymousOrgId));
    return { ok: false, reason: AUTH_FAILURES.missing };
  }

  private async fromHeader(header: string): Promise<AuthResult> {
    if (!header.toLowerCase().startsWith(BEARER_PREFIX))
      return { ok: false, reason: AUTH_FAILURES.malformed };
    const token = header.slice(BEARER_PREFIX.length).trim();
    if (token === '') return { ok: false, reason: AUTH_FAILURES.malformed };
    const { operatorKey, verifier } = this.options;
    if (operatorKey !== null && !looksLikeJwt(token)) {
      return operatorKeyMatches(token, operatorKey.key)
        ? success(operatorKeyPrincipal(operatorKey.orgId))
        : { ok: false, reason: AUTH_FAILURES.operatorKey };
    }
    if (verifier === null)
      return { ok: false, reason: AUTH_FAILURES.unconfigured };
    return verifier.verify(token);
  }
}
