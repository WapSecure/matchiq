import { char, text, timestamp } from 'drizzle-orm/pg-core';
import { DB_LIMITS } from '../constants.js';

export const orgId = () => text('org_id').notNull();
export const fixtureId = () => text('fixture_id').notNull();
export const sha256 = (name: string) =>
  char(name, { length: DB_LIMITS.sha256HexLength });
export const utc = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'date', precision: 3 });
export const createdAt = () => utc('created_at').notNull().defaultNow();
