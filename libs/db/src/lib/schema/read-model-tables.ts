import type { MatchSnapshot } from '@matchiq/contracts';
import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import type { RecapDocument } from '../intelligence-types.js';
import { createdAt, fixtureId, orgId, sha256, utc } from './columns.js';
import { fixtureFk } from './fixture-fk.js';

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
