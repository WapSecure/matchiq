import type {
  Fixture,
  MatchEvent,
  Provenance,
  StreamMessage,
} from '@matchiq/contracts';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import { createdAt, fixtureId, orgId, sha256, utc } from './columns.js';

/** ADR-0007: every business table carries org_id; isolation is not enforced. */
export const fixtures = pgTable(
  TABLES.fixtures,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    status: text('status').notNull(),
    title: text('title').notNull(),
    kickoffUtc: utc('kickoff_utc').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    payload: jsonb('payload').$type<Fixture>().notNull(),
    payloadHash: sha256('payload_hash').notNull(),
    provenance: jsonb('provenance').$type<Provenance>().notNull(),
    /** Last allocated stream_sequence; the row lock serialises allocation. */
    streamHead: bigint('stream_head', { mode: 'number' }).notNull().default(0),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'fixtures_pk', columns: [t.orgId, t.fixtureId] }),
    index('fixtures_org_kickoff_idx').on(t.orgId, t.kickoffUtc, t.fixtureId),
    check('fixtures_stream_head_nonnegative', sql`${t.streamHead} >= 0`),
  ],
);

export const matchEvents = pgTable(
  TABLES.matchEvents,
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: orgId(),
    fixtureId: fixtureId(),
    eventId: text('event_id').notNull(),
    sequence: integer('sequence').notNull(),
    type: text('type').notNull(),
    period: smallint('period').notNull(),
    matchClockMs: integer('match_clock_ms').notNull(),
    wallClockUtc: utc('wall_clock_utc').notNull(),
    schemaVersion: integer('schema_version').notNull(),
    payload: jsonb('payload').$type<MatchEvent>().notNull(),
    payloadHash: sha256('payload_hash').notNull(),
    ingestionId: text('ingestion_id').notNull(),
    ingestedAt: utc('ingested_at').notNull().defaultNow(),
  },
  (t) => [
    unique('match_events_sequence_uq').on(t.orgId, t.fixtureId, t.sequence),
    unique('match_events_event_id_uq').on(t.orgId, t.fixtureId, t.eventId),
    index('match_events_clock_idx').on(
      t.orgId,
      t.fixtureId,
      t.period,
      t.matchClockMs,
    ),
    foreignKey({
      name: 'match_events_fixture_fk',
      columns: [t.orgId, t.fixtureId],
      foreignColumns: [fixtures.orgId, fixtures.fixtureId],
    }).onDelete('cascade'),
    check('match_events_sequence_nonnegative', sql`${t.sequence} >= 0`),
    check('match_events_clock_nonnegative', sql`${t.matchClockMs} >= 0`),
  ],
);

/** Transactional outbox and SSE replay log in one table (ADR-0006). */
export const streamMessages = pgTable(
  TABLES.streamMessages,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    streamSequence: bigint('stream_sequence', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    message: jsonb('message').$type<StreamMessage>().notNull(),
    createdAt: createdAt(),
    publishedAt: utc('published_at'),
  },
  (t) => [
    primaryKey({
      name: 'stream_messages_pk',
      columns: [t.orgId, t.fixtureId, t.streamSequence],
    }),
    // Relays drain in stream order; stream order, not created_at, is commit order.
    index('stream_messages_unpublished_idx')
      .on(t.orgId, t.fixtureId, t.streamSequence)
      .where(sql`${t.publishedAt} is null`),
    foreignKey({
      name: 'stream_messages_fixture_fk',
      columns: [t.orgId, t.fixtureId],
      foreignColumns: [fixtures.orgId, fixtures.fixtureId],
    }).onDelete('cascade'),
    check('stream_messages_sequence_positive', sql`${t.streamSequence} > 0`),
  ],
);

export const auditEvents = pgTable(
  TABLES.auditEvents,
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: orgId(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    requestId: text('request_id'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_events_target_idx').on(
      t.orgId,
      t.targetType,
      t.targetId,
      t.createdAt,
    ),
  ],
);

export const idempotencyKeys = pgTable(
  TABLES.idempotencyKeys,
  {
    orgId: orgId(),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    requestHash: sha256('request_hash').notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<unknown>(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: 'idempotency_keys_pk',
      columns: [t.orgId, t.scope, t.key],
    }),
    index('idempotency_keys_created_idx').on(t.createdAt),
  ],
);
