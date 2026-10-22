import { z } from 'zod';
import { LIMITS, MESSAGES, PATTERNS } from './constants.js';
import { FixtureId, UtcTimestamp } from './primitives.js';

export const AUDIT_ACTIONS = {
  fixtureCreated: 'fixture.created',
  eventsIngested: 'events.ingested',
  sessionCreated: 'replay.session.created',
  commandRejected: 'replay.command.rejected',
  sessionsPurged: 'retention.sessions.purged',
  retentionRun: 'retention.run',
  overlayRetracted: 'overlay.retracted',
  overlayHeld: 'overlay.held',
  overlayBlocked: 'overlay.blocked',
  insightSuppressed: 'insight.suppressed',
  publicationGated: 'publication.gated',
  editorialFrozen: 'editorial.frozen',
  editorialResumed: 'editorial.resumed',
  killSwitchActivated: 'kill-switch.activated',
  killSwitchReleased: 'kill-switch.released',
} as const;

/** Dotted lower-case verb phrase; open so new actions never invalidate stored rows. */
export const AuditAction = z.string().regex(PATTERNS.auditAction);

/** USER and SERVICE are OIDC principals (ADR-0015); OPERATOR is the dev/CI key. */
export const AuditActorType = z.enum([
  'USER',
  'SERVICE',
  'OPERATOR',
  'SYSTEM',
  'ANONYMOUS',
]);

export const AuditTargetType = z.enum([
  'fixture',
  'overlay',
  'insight',
  'organization',
  'retention',
]);

const identifier = z.string().min(1).max(LIMITS.auditIdentifierMax);

export const AuditActor = z.strictObject({
  type: AuditActorType,
  id: identifier,
});

export const AuditTarget = z.strictObject({
  type: AuditTargetType,
  id: identifier,
});

const AuditState = z.record(z.string(), z.unknown());

/** Spec §40/§41: privileged actions with actor, tenant scope, correlation and before/after. */
export const AuditEvent = z.strictObject({
  id: z.uuid(),
  action: AuditAction,
  actor: AuditActor,
  target: AuditTarget,
  fixtureId: FixtureId.nullable(),
  reason: z.string().nullable(),
  correlationId: identifier.nullable(),
  requestId: identifier.nullable(),
  before: AuditState.nullable(),
  after: AuditState.nullable(),
  details: AuditState,
  at: UtcTimestamp,
});

/** `GET /audit-events` query; newest first, keyset-paginated by `cursor`. */
export const AuditEventQuery = z
  .strictObject({
    action: AuditAction.optional(),
    actorType: AuditActorType.optional(),
    targetType: AuditTargetType.optional(),
    targetId: identifier.optional(),
    fixtureId: FixtureId.optional(),
    from: UtcTimestamp.optional(),
    to: UtcTimestamp.optional(),
    cursor: z.string().min(1).max(LIMITS.auditCursorMax).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(LIMITS.auditPageMax)
      .default(LIMITS.auditPageDefault),
  })
  .refine((q) => !(q.from && q.to && q.from > q.to), {
    path: ['from'],
    message: MESSAGES.auditRange,
  })
  .refine((q) => q.targetId === undefined || q.targetType !== undefined, {
    path: ['targetId'],
    message: MESSAGES.auditTarget,
  });

export const AuditEventPage = z.strictObject({
  items: z.array(AuditEvent),
  /** Opaque; pass back as `cursor` for the next (older) page. Null on the last page. */
  nextCursor: z.string().nullable(),
});

export type AuditAction = z.infer<typeof AuditAction>;
export type AuditActorType = z.infer<typeof AuditActorType>;
export type AuditTargetType = z.infer<typeof AuditTargetType>;
export type AuditActor = z.infer<typeof AuditActor>;
export type AuditTarget = z.infer<typeof AuditTarget>;
export type AuditEvent = z.infer<typeof AuditEvent>;
export type AuditEventQuery = z.infer<typeof AuditEventQuery>;
export type AuditEventPage = z.infer<typeof AuditEventPage>;
