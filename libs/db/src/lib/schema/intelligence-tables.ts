import type {
  AgentRun,
  Fixture,
  Insight,
  MatchEvent,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import { sql } from 'drizzle-orm';
import {
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
  type PgColumn,
} from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import type {
  GateReport,
  InsightPublication,
  RecapDocument,
} from '../intelligence-types.js';
import { createdAt, fixtureId, orgId, sha256, utc } from './columns.js';
import { fixtures } from './tables.js';

const fixtureFk = (name: string, t: { orgId: PgColumn; fixtureId: PgColumn }) =>
  foreignKey({
    name,
    columns: [t.orgId, t.fixtureId],
    foreignColumns: [fixtures.orgId, fixtures.fixtureId],
  }).onDelete('cascade');

/** Golden fixture files loaded by `pnpm seed:fixtures`; replay sessions copy from these. */
export const fixtureTemplates = pgTable(
  TABLES.fixtureTemplates,
  {
    orgId: orgId(),
    templateId: text('template_id').notNull(),
    title: text('title').notNull(),
    scenario: text('scenario').notNull(),
    seed: integer('seed').notNull(),
    fixture: jsonb('fixture').$type<Fixture>().notNull(),
    events: jsonb('events').$type<MatchEvent[]>().notNull(),
    eventCount: integer('event_count').notNull(),
    eventsHash: sha256('events_hash').notNull(),
    finalScore: jsonb('final_score')
      .$type<{ home: number; away: number }>()
      .notNull(),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'fixture_templates_pk',
      columns: [t.orgId, t.templateId],
    }),
  ],
);

/** One replay of a template; `fixture_id` is the session's own fixture and ledger. */
export const replaySessions = pgTable(
  TABLES.replaySessions,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    templateId: text('template_id').notNull(),
    sessionNumber: integer('session_number').notNull(),
    state: text('state').notNull(),
    speed: smallint('speed').notNull(),
    appliedSequence: integer('applied_sequence').notNull().default(-1),
    period: smallint('period'),
    matchClockMs: integer('match_clock_ms').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'replay_sessions_pk',
      columns: [t.orgId, t.fixtureId],
    }),
    unique('replay_sessions_number_uq').on(
      t.orgId,
      t.templateId,
      t.sessionNumber,
    ),
    fixtureFk('replay_sessions_fixture_fk', t),
    foreignKey({
      name: 'replay_sessions_template_fk',
      columns: [t.orgId, t.templateId],
      foreignColumns: [fixtureTemplates.orgId, fixtureTemplates.templateId],
    }),
    index('replay_sessions_created_idx').on(t.orgId, t.createdAt),
    index('replay_sessions_activity_idx').on(t.orgId, t.state, t.updatedAt),
    index('replay_sessions_updated_idx').on(t.updatedAt),
  ],
);

export const insights = pgTable(
  TABLES.insights,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    insightId: text('insight_id').notNull(),
    revision: integer('revision').notNull(),
    kind: text('kind').notNull(),
    priority: text('priority').notNull(),
    period: smallint('period').notNull(),
    matchClockMs: integer('match_clock_ms').notNull(),
    status: text('status').notNull(),
    /** PENDING until the gate publishes narratives; AGENT or TEMPLATE afterwards. */
    publication: text('publication').$type<InsightPublication>().notNull(),
    payload: jsonb('payload').$type<Insight>().notNull(),
    gateReport: jsonb('gate_report').$type<GateReport>(),
    fallbackReason: text('fallback_reason'),
    detectedSequence: integer('detected_sequence').notNull(),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'insights_pk',
      columns: [t.orgId, t.fixtureId, t.insightId],
    }),
    fixtureFk('insights_fixture_fk', t),
    index('insights_order_idx').on(t.orgId, t.fixtureId, t.detectedSequence),
    index('insights_pending_idx')
      .on(t.orgId, t.createdAt)
      .where(sql`${t.publication} = 'PENDING'`),
  ],
);

export const narratives = pgTable(
  TABLES.narratives,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    narrativeId: text('narrative_id').notNull(),
    insightId: text('insight_id').notNull(),
    persona: text('persona').notNull(),
    locale: text('locale').notNull(),
    source: text('source').notNull(),
    revision: integer('revision').notNull(),
    payload: jsonb('payload').$type<Narrative>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: 'narratives_pk',
      columns: [t.orgId, t.fixtureId, t.narrativeId],
    }),
    unique('narratives_variant_uq').on(
      t.orgId,
      t.fixtureId,
      t.insightId,
      t.persona,
      t.locale,
      t.revision,
    ),
    fixtureFk('narratives_fixture_fk', t),
  ],
);

export const overlayCues = pgTable(
  TABLES.overlayCues,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    overlayId: text('overlay_id').notNull(),
    insightId: text('insight_id'),
    revision: integer('revision').notNull(),
    status: text('status').notNull(),
    priority: integer('priority').notNull(),
    period: smallint('period').notNull(),
    clockStartMs: integer('clock_start_ms').notNull(),
    clockEndMs: integer('clock_end_ms').notNull(),
    payload: jsonb('payload').$type<OverlayCue>().notNull(),
    endReason: text('end_reason'),
    publishedSequence: integer('published_sequence').notNull(),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'overlay_cues_pk',
      columns: [t.orgId, t.fixtureId, t.overlayId],
    }),
    fixtureFk('overlay_cues_fixture_fk', t),
    index('overlay_cues_clock_idx').on(
      t.orgId,
      t.fixtureId,
      t.period,
      t.clockStartMs,
    ),
  ],
);

export const agentRuns = pgTable(
  TABLES.agentRuns,
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: orgId(),
    fixtureId: fixtureId(),
    insightId: text('insight_id').notNull(),
    runId: text('run_id').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    agent: text('agent').notNull(),
    provider: text('provider').notNull(),
    outcome: text('outcome').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    payload: jsonb('payload').$type<AgentRun>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    fixtureFk('agent_runs_fixture_fk', t),
    index('agent_runs_insight_idx').on(t.orgId, t.fixtureId, t.insightId),
    index('agent_runs_correlation_idx').on(t.orgId, t.correlationId),
  ],
);

/** Latest projection per fixture, for `GET /fixtures/:id/state`. */
export const matchSnapshots = pgTable(
  TABLES.matchSnapshots,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    throughSequence: integer('through_sequence').notNull(),
    payload: jsonb('payload').$type<MatchSnapshot>().notNull(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'match_snapshots_pk',
      columns: [t.orgId, t.fixtureId],
    }),
    fixtureFk('match_snapshots_fixture_fk', t),
    check('match_snapshots_sequence_valid', sql`${t.throughSequence} >= -1`),
  ],
);

export const matchRecaps = pgTable(
  TABLES.matchRecaps,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    payload: jsonb('payload').$type<RecapDocument>().notNull(),
    payloadHash: sha256('payload_hash').notNull(),
    createdAt: createdAt(),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: 'match_recaps_pk', columns: [t.orgId, t.fixtureId] }),
    fixtureFk('match_recaps_fixture_fk', t),
  ],
);
