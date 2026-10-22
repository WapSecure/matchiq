import { foreignKey, type PgColumn } from 'drizzle-orm/pg-core';
import { fixtures } from './tables.js';

export const fixtureFk = (
  name: string,
  t: { orgId: PgColumn; fixtureId: PgColumn },
) =>
  foreignKey({
    name,
    columns: [t.orgId, t.fixtureId],
    foreignColumns: [fixtures.orgId, fixtures.fixtureId],
  });
