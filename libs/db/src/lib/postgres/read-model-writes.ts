import type { MatchSnapshot, ReplayStatus } from '@matchiq/contracts';
import { and, eq, sql } from 'drizzle-orm';
import type { Transaction } from '../client.js';
import { sha256Hex } from '../hash.js';
import type { RecapDocument, SessionProgress } from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';
import {
  matchRecaps,
  matchSnapshots,
  replaySessions,
} from '../schema/intelligence-tables.js';

const sessionOf = (key: FixtureKey) =>
  and(
    eq(replaySessions.orgId, key.orgId),
    eq(replaySessions.fixtureId, key.fixtureId),
  );

/** Latest-only read models; each write replaces the previous row. */
export const saveSnapshot = async (
  tx: Transaction,
  key: FixtureKey,
  snapshot: MatchSnapshot,
): Promise<void> => {
  const values = {
    throughSequence: snapshot.throughSequence,
    payload: snapshot,
  };
  await tx
    .insert(matchSnapshots)
    .values({ orgId: key.orgId, fixtureId: key.fixtureId, ...values })
    .onConflictDoUpdate({
      target: [matchSnapshots.orgId, matchSnapshots.fixtureId],
      set: { ...values, updatedAt: sql`now()` },
    });
};

export const saveRecap = async (
  tx: Transaction,
  key: FixtureKey,
  recap: RecapDocument,
): Promise<void> => {
  const values = { payload: recap, payloadHash: sha256Hex(recap) };
  await tx
    .insert(matchRecaps)
    .values({ orgId: key.orgId, fixtureId: key.fixtureId, ...values })
    .onConflictDoUpdate({
      target: [matchRecaps.orgId, matchRecaps.fixtureId],
      set: { ...values, updatedAt: sql`now()` },
    });
};

export const updateSession = async (
  tx: Transaction,
  key: FixtureKey,
  status: ReplayStatus,
): Promise<void> => {
  await tx
    .update(replaySessions)
    .set({
      state: status.state,
      speed: status.speed,
      appliedSequence: status.appliedSequence,
      period: status.period,
      matchClockMs: status.matchClockMs,
      updatedAt: sql`now()`,
    })
    .where(sessionOf(key));
};

export const updateSessionProgress = async (
  tx: Transaction,
  key: FixtureKey,
  progress: SessionProgress,
): Promise<void> => {
  await tx
    .update(replaySessions)
    .set({ ...progress, updatedAt: sql`now()` })
    .where(sessionOf(key));
};
