import type { PreferenceProfile, ViewerPreferences } from '@matchiq/contracts';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../client.js';
import { STORE_ERRORS } from '../constants.js';
import { preferenceProfiles } from '../schema/preference-tables.js';
import { withTenant } from './tenant-scope.js';

const t = preferenceProfiles;

/** Whose profile: the organisation and the identity provider subject. */
export interface PreferenceOwner {
  readonly orgId: string;
  readonly userId: string;
}

export interface PreferenceStore {
  /** Null when the user has never saved. */
  get(owner: PreferenceOwner): Promise<PreferenceProfile | null>;
  /** Replaces the whole profile; saving identical values keeps `updatedAt`. */
  put(
    owner: PreferenceOwner,
    preferences: ViewerPreferences,
  ): Promise<PreferenceProfile>;
}

const columns = {
  persona: t.persona,
  locale: t.locale,
  favouriteTeamId: t.favouriteTeamId,
  followedPlayerIds: t.followedPlayerIds,
  reducedMotion: t.reducedMotion,
  updatedAt: t.updatedAt,
};

type Row = { [K in keyof typeof columns]: (typeof t.$inferSelect)[K] };

const toProfile = (row: Row): PreferenceProfile => ({
  persona: row.persona,
  locale: row.locale,
  favouriteTeamId: row.favouriteTeamId,
  followedPlayerIds: [...row.followedPlayerIds],
  reducedMotion: row.reducedMotion,
  updatedAt: row.updatedAt.toISOString(),
});

const ownedBy = (owner: PreferenceOwner) =>
  and(eq(t.orgId, owner.orgId), eq(t.userId, owner.userId));

export class PostgresPreferenceStore implements PreferenceStore {
  constructor(private readonly db: Database) {}

  async get(owner: PreferenceOwner): Promise<PreferenceProfile | null> {
    const [row] = await withTenant(this.db, owner.orgId, (tx) =>
      tx.select(columns).from(t).where(ownedBy(owner)),
    );
    return row ? toProfile(row) : null;
  }

  async put(
    owner: PreferenceOwner,
    preferences: ViewerPreferences,
  ): Promise<PreferenceProfile> {
    const values = {
      ...preferences,
      followedPlayerIds: [...preferences.followedPlayerIds],
    };
    return withTenant(this.db, owner.orgId, async (tx) => {
      // `IS DISTINCT FROM` on the row skips no-op writes, so a retried PUT
      // returns the profile unchanged, `updatedAt` included.
      await tx
        .insert(t)
        .values({ ...owner, ...values })
        .onConflictDoUpdate({
          target: [t.orgId, t.userId],
          set: { ...values, updatedAt: sql`now()` },
          setWhere: sql`(${t.persona}, ${t.locale}, ${t.favouriteTeamId}, ${t.followedPlayerIds}, ${t.reducedMotion}) is distinct from (excluded.persona, excluded.locale, excluded.favourite_team_id, excluded.followed_player_ids, excluded.reduced_motion)`,
        });
      const [row] = await tx.select(columns).from(t).where(ownedBy(owner));
      if (!row) throw new Error(STORE_ERRORS.preferenceMissingAfterUpsert);
      return toProfile(row);
    });
  }
}
