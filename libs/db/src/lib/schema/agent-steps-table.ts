import type { AgentStep } from '@matchiq/contracts';
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import { createdAt, fixtureId, orgId } from './columns.js';
import { fixtureFk } from './fixture-fk.js';

/**
 * One row per agent handoff (MQ-064). A table rather than a JSONB column on
 * `agent_runs`: steps belong to a pipeline run, not to one model call, and the
 * trace endpoint reads them by correlation id under row-level security.
 */
export const agentSteps = pgTable(
  TABLES.agentSteps,
  {
    orgId: orgId(),
    fixtureId: fixtureId(),
    insightId: text('insight_id').notNull(),
    correlationId: uuid('correlation_id').notNull(),
    runId: text('run_id').notNull(),
    stepIndex: smallint('step_index').notNull(),
    role: text('role').notNull(),
    decision: text('decision').notNull(),
    payload: jsonb('payload').$type<AgentStep>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({
      name: 'agent_steps_pk',
      columns: [t.orgId, t.correlationId, t.stepIndex],
    }),
    fixtureFk('agent_steps_fixture_fk', t),
    index('agent_steps_insight_idx').on(t.orgId, t.fixtureId, t.insightId),
  ],
);
