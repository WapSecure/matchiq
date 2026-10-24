import type { Locale, Persona } from '@matchiq/contracts';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core';
import { TABLES } from '../constants.js';
import { orgId, utc } from './columns.js';

/**
 * One viewing profile per signed-in user per organisation (spec §27, §29).
 * `user_id` is the identity provider's subject; nothing else about the
 * person is stored.
 */
export const preferenceProfiles = pgTable(
  TABLES.preferenceProfiles,
  {
    orgId: orgId(),
    userId: text('user_id').notNull(),
    persona: text('persona').$type<Persona>().notNull(),
    locale: text('locale').$type<Locale>().notNull(),
    favouriteTeamId: text('favourite_team_id'),
    followedPlayerIds: jsonb('followed_player_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    reducedMotion: boolean('reduced_motion').notNull().default(false),
    updatedAt: utc('updated_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'preference_profiles_pk',
      columns: [t.orgId, t.userId],
    }),
    check(
      'preference_profiles_followed_is_array',
      sql`jsonb_typeof(${t.followedPlayerIds}) = 'array'`,
    ),
  ],
);
