import { StreamMessage, type Fixture } from '@matchiq/contracts';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { Database, Transaction } from '../client.js';
import type {
  AuditEntry,
  FixtureKey,
  HashedEvent,
  IdempotencyClaim,
  IdempotencyRequest,
  LedgerTransaction,
  StoredEventRef,
  StoredResponse,
  StreamMessageDraft,
  UnitOfWork,
} from '../ports.js';
import {
  auditEvents,
  fixtures,
  idempotencyKeys,
  matchEvents,
  streamMessages,
} from '../schema/tables.js';
import { claimIdempotencyKey } from './idempotency.js';
import { TenantPin } from './tenant-scope.js';

export const fixtureMatch = (key: FixtureKey) =>
  and(eq(fixtures.orgId, key.orgId), eq(fixtures.fixtureId, key.fixtureId));

const eventsOf = (key: FixtureKey) =>
  and(
    eq(matchEvents.orgId, key.orgId),
    eq(matchEvents.fixtureId, key.fixtureId),
  );

const auditValues = (entry: AuditEntry) => ({
  orgId: entry.orgId,
  actor: entry.actor,
  actorType: entry.actorType ?? 'OPERATOR',
  actorDisplayName: entry.actorDisplayName ?? null,
  action: entry.action,
  targetType: entry.targetType,
  targetId: entry.targetId,
  fixtureId: entry.fixtureId ?? null,
  reason: entry.reason ?? null,
  correlationId: entry.correlationId ?? null,
  requestId: entry.requestId ?? null,
  before: entry.before ?? null,
  after: entry.after ?? null,
  details: entry.details,
});

/**
 * Extended by the worker's pipeline transaction (see pipeline-transaction.ts).
 * Every operation pins the transaction to its organisation first, so all of
 * its statements run under row-level security for that tenant (ADR-0018).
 */
export class PostgresLedgerTransaction implements LedgerTransaction {
  constructor(
    protected readonly tx: Transaction,
    protected readonly pin: TenantPin = new TenantPin(tx),
  ) {}

  async insertFixture(
    orgId: string,
    fixture: Fixture,
    payloadHash: string,
  ): Promise<boolean> {
    await this.pin.to(orgId);
    const rows = await this.tx
      .insert(fixtures)
      .values({
        orgId,
        fixtureId: fixture.fixtureId,
        status: fixture.status,
        title: fixture.title,
        kickoffUtc: new Date(fixture.kickoffUtc),
        schemaVersion: fixture.schemaVersion,
        payload: fixture,
        payloadHash,
        provenance: fixture.provenance,
      })
      .onConflictDoNothing()
      .returning({ fixtureId: fixtures.fixtureId });
    return rows.length > 0;
  }

  async lockFixture(key: FixtureKey): Promise<boolean> {
    await this.pin.to(key.orgId);
    const rows = await this.tx
      .select({ fixtureId: fixtures.fixtureId })
      .from(fixtures)
      .where(fixtureMatch(key))
      .for('update');
    return rows.length > 0;
  }

  async findEventRefs(
    key: FixtureKey,
    eventIds: readonly string[],
    sequences: readonly number[],
  ): Promise<StoredEventRef[]> {
    await this.pin.to(key.orgId);
    return this.tx
      .select({
        eventId: matchEvents.eventId,
        sequence: matchEvents.sequence,
        payloadHash: matchEvents.payloadHash,
      })
      .from(matchEvents)
      .where(
        and(
          eventsOf(key),
          or(
            inArray(matchEvents.eventId, [...eventIds]),
            inArray(matchEvents.sequence, [...sequences]),
          ),
        ),
      );
  }

  async insertEvents(
    key: FixtureKey,
    ingestionId: string,
    events: readonly HashedEvent[],
  ): Promise<void> {
    if (events.length === 0) return;
    await this.pin.to(key.orgId);
    await this.tx.insert(matchEvents).values(
      events.map(({ event, payloadHash }) => ({
        orgId: key.orgId,
        fixtureId: key.fixtureId,
        eventId: event.eventId,
        sequence: event.sequence,
        type: event.type,
        period: event.period,
        matchClockMs: event.matchClockMs,
        wallClockUtc: new Date(event.wallClockUtc),
        schemaVersion: event.schemaVersion,
        payload: event,
        payloadHash,
        ingestionId,
      })),
    );
  }

  async appendStreamMessages(
    key: FixtureKey,
    drafts: readonly StreamMessageDraft[],
  ): Promise<StreamMessage[]> {
    if (drafts.length === 0) return [];
    await this.pin.to(key.orgId);
    const [row] = await this.tx
      .update(fixtures)
      .set({ streamHead: sql`${fixtures.streamHead} + ${drafts.length}` })
      .where(fixtureMatch(key))
      .returning({ head: fixtures.streamHead });
    if (!row) throw new Error(`Unknown fixture ${key.fixtureId}`);
    const first = row.head - drafts.length + 1;
    const messages = drafts.map((draft, i) =>
      StreamMessage.parse({ ...draft, streamSequence: first + i }),
    );
    await this.tx.insert(streamMessages).values(
      messages.map((message) => ({
        orgId: key.orgId,
        fixtureId: key.fixtureId,
        streamSequence: message.streamSequence,
        type: message.type,
        message,
      })),
    );
    return messages;
  }

  async appendAudit(entry: AuditEntry): Promise<string> {
    await this.pin.to(entry.orgId);
    const [row] = await this.tx
      .insert(auditEvents)
      .values(auditValues(entry))
      .returning({ id: auditEvents.id });
    if (!row) throw new Error('audit insert returned no row');
    return row.id;
  }

  async appendAudits(entries: readonly AuditEntry[]): Promise<void> {
    if (entries.length === 0) return;
    for (const entry of entries) await this.pin.to(entry.orgId);
    await this.tx.insert(auditEvents).values(entries.map(auditValues));
  }

  async claimIdempotencyKey(
    request: IdempotencyRequest,
  ): Promise<IdempotencyClaim> {
    await this.pin.to(request.orgId);
    return claimIdempotencyKey(this.tx, request);
  }

  async completeIdempotencyKey(
    request: IdempotencyRequest,
    response: StoredResponse,
  ): Promise<void> {
    await this.pin.to(request.orgId);
    await this.tx
      .update(idempotencyKeys)
      .set({ responseStatus: response.status, responseBody: response.body })
      .where(
        and(
          eq(idempotencyKeys.orgId, request.orgId),
          eq(idempotencyKeys.scope, request.scope),
          eq(idempotencyKeys.key, request.key),
        ),
      );
  }
}

export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: LedgerTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(new PostgresLedgerTransaction(tx)));
  }
}
