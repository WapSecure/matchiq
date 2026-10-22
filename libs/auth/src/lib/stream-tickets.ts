import { randomUUID } from 'node:crypto';
import {
  type AnyRole,
  buildPrincipal,
  type Principal,
  PRINCIPAL_KINDS,
  ROLE_PERMISSIONS,
} from '@matchiq/access';
import { errors, jwtVerify, SignJWT } from 'jose';
import { AUTH_FAILURES, STREAM_TICKET } from './constants';
import type { VerifyOutcome } from './access-token-verifier';

export interface StreamTicketOptions {
  readonly secret: string;
  readonly ttlSeconds: number;
  readonly now?: () => Date;
}

export interface IssuedTicket {
  readonly ticket: string;
  readonly expiresAt: string;
}

const MS_PER_SECOND = 1_000;
/** A ticket can only open a stream, whatever the issuing principal could do. */
const TICKET_SCOPES = ['fixtures:read'];

const isRole = (value: unknown): value is AnyRole =>
  typeof value === 'string' && Object.hasOwn(ROLE_PERMISSIONS, value);

const isKind = (value: unknown): value is Principal['kind'] =>
  PRINCIPAL_KINDS.some((kind) => kind === value);

/**
 * Short-lived HS256 tickets for clients that cannot send headers on a
 * stream request (ADR-0015). Bound to one organisation and one fixture.
 */
export class StreamTickets {
  private readonly key: Uint8Array;
  private readonly now: () => Date;

  constructor(private readonly options: StreamTicketOptions) {
    this.key = new TextEncoder().encode(options.secret);
    this.now = options.now ?? (() => new Date());
  }

  async issue(principal: Principal, fixtureId: string): Promise<IssuedTicket> {
    const issuedAt = Math.floor(this.now().getTime() / MS_PER_SECOND);
    const expiresAt = issuedAt + this.options.ttlSeconds;
    const ticket = await new SignJWT({
      org: principal.orgId,
      fx: fixtureId,
      roles: [...principal.roles],
      kind: principal.kind,
    })
      .setProtectedHeader({ alg: STREAM_TICKET.algorithm })
      .setIssuer(STREAM_TICKET.issuer)
      .setAudience(STREAM_TICKET.audience)
      .setSubject(principal.userId)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(this.key);
    return {
      ticket,
      expiresAt: new Date(expiresAt * MS_PER_SECOND).toISOString(),
    };
  }

  async verify(ticket: string, fixtureId: string): Promise<VerifyOutcome> {
    try {
      const { payload } = await jwtVerify(ticket, this.key, {
        issuer: STREAM_TICKET.issuer,
        audience: STREAM_TICKET.audience,
        algorithms: [STREAM_TICKET.algorithm],
        currentDate: this.now(),
      });
      const roles = Array.isArray(payload['roles'])
        ? payload['roles'].filter(isRole)
        : [];
      const { sub, org, fx, kind } = payload;
      if (fx !== fixtureId)
        return { ok: false, reason: AUTH_FAILURES.ticketScope };
      if (typeof sub !== 'string' || typeof org !== 'string' || !isKind(kind))
        return { ok: false, reason: AUTH_FAILURES.claims };
      return {
        ok: true,
        principal: buildPrincipal({
          kind,
          userId: sub,
          orgId: org,
          roles,
          scopes: TICKET_SCOPES,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof errors.JWTExpired
            ? AUTH_FAILURES.expired
            : AUTH_FAILURES.badSignature,
      };
    }
  }
}
