import { randomUUID } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  IngestBatchResponse,
  SCHEMA_VERSION,
  type IngestBatchRequest,
} from '@matchiq/contracts';
import {
  AUDIT_ACTIONS,
  type FixtureKey,
  type HashedEvent,
  type LedgerTransaction,
  sha256Hex,
  type StreamMessageDraft,
  type UnitOfWork,
} from '@matchiq/db';
import type { Principal } from '@matchiq/access';
import type { FieldError } from '@matchiq/server-kit';
import {
  AUDIT_TARGETS,
  FIELD_MESSAGES,
  ID_PREFIXES,
  IDEMPOTENCY_SCOPES,
} from '../constants';
import { type IdempotentResult, withIdempotency } from '../http/idempotency';
import { problem } from '../http/problems';
import {
  CLOCK,
  type Clock,
  OUTBOX_NOTIFIER,
  type OutboxNotifier,
  UNIT_OF_WORK,
} from '../infrastructure/tokens';
import { actorTypeOf, auditNameOf } from '../auth/actor';
import { actorDetails } from '../auth/audit-trail.service';
import { classifyBatch } from './classify-batch';

export interface IngestCommand {
  /** `key.orgId` is the principal's organisation (ADR-0018). */
  readonly key: FixtureKey;
  readonly batch: IngestBatchRequest;
  readonly principal: Principal;
  readonly requestId?: string;
  readonly idempotencyKey?: string;
}

const NO_SEQUENCE = -1;

const fixtureMismatches = ({ key, batch }: IngestCommand): FieldError[] => {
  const errors: FieldError[] = [];
  const mustMatch = FIELD_MESSAGES.mustMatchPath(key.fixtureId);
  if (batch.fixtureId !== key.fixtureId) {
    errors.push({ path: '$.fixtureId', message: mustMatch });
  }
  batch.events.forEach((event, i) => {
    if (event.fixtureId !== key.fixtureId) {
      errors.push({ path: `$.events.${i}.fixtureId`, message: mustMatch });
    }
  });
  return errors;
};

@Injectable()
export class IngestService {
  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    @Inject(OUTBOX_NOTIFIER) private readonly outbox: OutboxNotifier,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async ingest(
    command: IngestCommand,
  ): Promise<IdempotentResult<IngestBatchResponse>> {
    const mismatches = fixtureMismatches(command);
    if (mismatches.length > 0) {
      throw problem('fixtureMismatch', { errors: mismatches });
    }
    const hashed = command.batch.events.map((event) => ({
      event,
      payloadHash: sha256Hex(event),
    }));
    const result = await this.uow.transaction(async (tx) => {
      if (!(await tx.lockFixture(command.key)))
        throw problem('fixtureNotFound');
      return withIdempotency(
        tx,
        {
          orgId: command.key.orgId,
          scope: IDEMPOTENCY_SCOPES.ingestBatch,
          key: command.idempotencyKey,
          request: { fixtureId: command.key.fixtureId, batch: command.batch },
          parse: (body) => IngestBatchResponse.parse(body),
        },
        () => this.apply(tx, command, hashed),
      );
    });
    if (!result.replayed && result.body.accepted > 0) this.outbox.notify();
    return result;
  }

  private async apply(
    tx: LedgerTransaction,
    command: IngestCommand,
    hashed: readonly HashedEvent[],
  ): Promise<{ status: number; body: IngestBatchResponse }> {
    const { key } = command;
    const stored = await tx.findEventRefs(
      key,
      hashed.map((h) => h.event.eventId),
      hashed.map((h) => h.event.sequence),
    );
    const { fresh, duplicates, conflicts } = classifyBatch(hashed, stored);
    if (conflicts.length > 0)
      throw problem('eventConflict', { errors: conflicts });

    const ingestionId = `${ID_PREFIXES.ingestion}${randomUUID()}`;
    await tx.insertEvents(key, ingestionId, fresh);
    await tx.appendStreamMessages(
      key,
      fresh.map((h) => this.draft(h, command)),
    );
    const body: IngestBatchResponse = {
      accepted: fresh.length,
      duplicates,
      rejected: 0,
      ingestionId,
      lastAcceptedSequence: fresh.at(-1)?.event.sequence ?? NO_SEQUENCE,
    };
    await tx.appendAudit({
      orgId: key.orgId,
      actor: command.principal.userId,
      actorType: actorTypeOf(command.principal),
      ...auditNameOf(command.principal),
      action: AUDIT_ACTIONS.eventsIngested,
      targetType: AUDIT_TARGETS.fixture,
      targetId: key.fixtureId,
      fixtureId: key.fixtureId,
      requestId: command.requestId,
      details: { ...actorDetails(command.principal), ...body },
    });
    return { status: HttpStatus.ACCEPTED, body };
  }

  private draft(
    { event }: HashedEvent,
    { key, requestId }: IngestCommand,
  ): StreamMessageDraft {
    return {
      schemaVersion: SCHEMA_VERSION,
      fixtureId: key.fixtureId,
      emittedAt: this.clock.now().toISOString(),
      ...(requestId === undefined ? {} : { traceId: requestId }),
      type: 'match.event',
      payload: event,
    };
  }
}
