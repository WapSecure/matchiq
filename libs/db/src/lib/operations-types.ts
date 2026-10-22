import type { Insight, ReplayState } from '@matchiq/contracts';
import type { AuditEntry, FixtureKey } from './ports.js';

/**
 * A session holds a replay slot while PLAYING, or while IDLE right after it
 * was created (its start command is in flight). Either stops counting once
 * untouched for `idleMs` (database time): an IDLE session never started, a PLAYING one
 * whose worker stopped advancing it.
 */
export interface ActiveSessionQuery {
  readonly orgId: string;
  readonly idleMs: number;
  /** Leaves this session out, for a command on a session that may already count. */
  readonly excludeFixtureId?: string;
}

export interface SessionCapacity {
  readonly max: number;
  readonly idleMs: number;
}

export class SessionCapacityExceeded extends Error {
  constructor(
    readonly active: number,
    readonly max: number,
  ) {
    super(`replay capacity reached: ${active} of ${max} sessions active`);
    this.name = 'SessionCapacityExceeded';
  }
}

export interface SessionActivity {
  countActive(query: ActiveSessionQuery): Promise<number>;
  /** Most recently updated first. */
  listInState(
    orgId: string,
    state: ReplayState,
    limit: number,
  ): Promise<readonly FixtureKey[]>;
}

export interface PendingInsightRef {
  readonly key: FixtureKey;
  readonly insight: Insight;
  readonly revision: number;
  readonly createdAt: Date;
}

export interface RetentionCounts {
  readonly sessions: number;
  readonly fixtures: number;
  readonly events: number;
  readonly streamMessages: number;
  readonly insights: number;
  readonly narratives: number;
  readonly overlays: number;
  readonly agentRuns: number;
  readonly snapshots: number;
  readonly recaps: number;
}

export interface RetentionStore {
  /**
   * Runs `work` only if no other process holds the retention lock; returns
   * null when skipped. The lock is a Postgres advisory lock, so one replica runs it.
   */
  exclusive<T>(work: () => Promise<T>): Promise<T | null>;
  /** Sessions untouched since `cutoff`, oldest first. Templates are never returned. */
  expiredSessions(cutoff: Date, limit: number): Promise<readonly FixtureKey[]>;
  /** Deletes the session fixtures and, by cascade, every row that depends on them. */
  deleteSessions(keys: readonly FixtureKey[]): Promise<RetentionCounts>;
  pruneIdempotencyKeys(cutoff: Date, limit: number): Promise<number>;
  pendingInsights(orgId: string, limit: number): Promise<PendingInsightRef[]>;
  audit(entry: AuditEntry): Promise<void>;
}
