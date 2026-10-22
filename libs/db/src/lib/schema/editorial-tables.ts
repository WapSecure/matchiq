import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import type { EditorialScope } from '../editorial-types.js';
import { orgId, utc } from './columns.js';

/**
 * Current editorial controls: one `ORG` row (the kill switch, `scope_id` is
 * the org id) and one `FIXTURE` row per session ever frozen. History lives
 * in `audit_events`.
 */
export const editorialControls = pgTable(
  TABLES.editorialControls,
  {
    orgId: orgId(),
    scopeType: text('scope_type').$type<EditorialScope>().notNull(),
    scopeId: text('scope_id').notNull(),
    active: boolean('active').notNull(),
    reason: text('reason').notNull(),
    changedBy: text('changed_by').notNull(),
    changedAt: utc('changed_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'editorial_controls_pk',
      columns: [t.orgId, t.scopeType, t.scopeId],
    }),
    check(
      'editorial_controls_scope_valid',
      sql`${t.scopeType} in ('ORG', 'FIXTURE')`,
    ),
  ],
);
