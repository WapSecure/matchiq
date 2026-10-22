import {
  Fixture,
  ReplaySpeed,
  ReplayState,
  SCHEMA_VERSION,
  type ReplayStatus,
} from '@matchiq/contracts';
import type { ActiveSessionQuery } from '../operations-types.js';
import { and, desc, eq, max } from 'drizzle-orm';
import type { Database, Transaction } from '../client.js';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTORS,
  AUDIT_TARGET_TYPES,
  DB_LIMITS,
  SESSION_ID_SEPARATOR,
} from '../constants.js';
import { sha256Hex } from '../hash.js';
import type {
  CreatedSession,
  CreateSessionCommand,
  ReplaySessionView,
  SessionStore,
} from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';
import {
  fixtureTemplates,
  replaySessions,
} from '../schema/intelligence-tables.js';
import { fixtures } from '../schema/tables.js';
import { PostgresLedgerTransaction } from './ledger-transaction.js';
import {
  countActiveSessions,
  listSessionsInState,
  reserveSlot,
} from './session-activity.js';

const s = replaySessions;

export const sessionIdOf = (templateId: string, sessionNumber: number) =>
  `${templateId}${SESSION_ID_SEPARATOR}${sessionNumber}`;

type SessionRow = typeof s.$inferSelect & { title: string };

const toView = (row: SessionRow): ReplaySessionView => ({
  sessionId: row.fixtureId,
  templateId: row.templateId,
  sessionNumber: row.sessionNumber,
  title: row.title,
  status: {
    fixtureId: row.fixtureId,
    state: ReplayState.parse(row.state),
    speed: ReplaySpeed.parse(row.speed),
    appliedSequence: row.appliedSequence,
    period: row.period,
    matchClockMs: row.matchClockMs,
  },
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const nextSessionNumber = async (
  tx: Transaction,
  command: CreateSessionCommand,
): Promise<number> => {
  const [row] = await tx
    .select({ last: max(s.sessionNumber) })
    .from(s)
    .where(
      and(eq(s.orgId, command.orgId), eq(s.templateId, command.templateId)),
    );
  return (row?.last ?? 0) + 1;
};

const sessionSelect = (db: Database | Transaction) =>
  db
    .select({
      orgId: s.orgId,
      fixtureId: s.fixtureId,
      templateId: s.templateId,
      sessionNumber: s.sessionNumber,
      state: s.state,
      speed: s.speed,
      appliedSequence: s.appliedSequence,
      period: s.period,
      matchClockMs: s.matchClockMs,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      title: fixtures.title,
    })
    .from(s)
    .innerJoin(
      fixtures,
      and(eq(fixtures.orgId, s.orgId), eq(fixtures.fixtureId, s.fixtureId)),
    );

export class PostgresSessionStore implements SessionStore {
  constructor(private readonly db: Database) {}

  /**
   * Locks the template row so concurrent starts get distinct session numbers,
   * then creates the session fixture, its session row and an IDLE status
   * message in one transaction.
   */
  create(command: CreateSessionCommand): Promise<CreatedSession | null> {
    return this.db.transaction(async (tx) => {
      if (command.capacity !== undefined) {
        await reserveSlot(tx, command.orgId, command.capacity);
      }
      const [template] = await tx
        .select({ fixture: fixtureTemplates.fixture })
        .from(fixtureTemplates)
        .where(
          and(
            eq(fixtureTemplates.orgId, command.orgId),
            eq(fixtureTemplates.templateId, command.templateId),
          ),
        )
        .for('update');
      if (!template) return null;
      const sessionNumber = await nextSessionNumber(tx, command);
      const fixture = Fixture.parse({
        ...template.fixture,
        fixtureId: sessionIdOf(command.templateId, sessionNumber),
        status: 'LIVE',
      });
      const key = { orgId: command.orgId, fixtureId: fixture.fixtureId };
      await this.insertRows(tx, { command, fixture, sessionNumber });
      await new PostgresLedgerTransaction(tx).appendStreamMessages(key, [
        {
          schemaVersion: SCHEMA_VERSION,
          fixtureId: fixture.fixtureId,
          emittedAt: new Date().toISOString(),
          type: 'replay.status',
          payload: idleStatus(fixture.fixtureId, command.speed),
        },
      ]);
      const [row] = await sessionSelect(tx).where(sessionMatch(key));
      if (!row) throw new Error(`Session ${key.fixtureId} was not created`);
      return { fixture, session: toView(row) };
    });
  }

  async get(key: FixtureKey): Promise<ReplaySessionView | null> {
    const [row] = await sessionSelect(this.db).where(sessionMatch(key));
    return row ? toView(row) : null;
  }

  countActive(query: ActiveSessionQuery): Promise<number> {
    return countActiveSessions(this.db, query);
  }

  listInState(
    orgId: string,
    state: ReplayState,
    limit: number,
  ): Promise<FixtureKey[]> {
    return listSessionsInState(this.db, { orgId, state, limit });
  }

  async list(orgId: string, limit: number): Promise<ReplaySessionView[]> {
    const rows = await sessionSelect(this.db)
      .where(eq(s.orgId, orgId))
      .orderBy(desc(s.createdAt), desc(s.fixtureId))
      .limit(Math.min(limit, DB_LIMITS.sessionListMax));
    return rows.map(toView);
  }

  private async insertRows(
    tx: Transaction,
    input: {
      command: CreateSessionCommand;
      fixture: Fixture;
      sessionNumber: number;
    },
  ): Promise<void> {
    const { command, fixture, sessionNumber } = input;
    const ledger = new PostgresLedgerTransaction(tx);
    await ledger.insertFixture(command.orgId, fixture, sha256Hex(fixture));
    await tx.insert(s).values({
      orgId: command.orgId,
      fixtureId: fixture.fixtureId,
      templateId: command.templateId,
      sessionNumber,
      state: 'IDLE',
      speed: command.speed,
    });
    await ledger.appendAudit({
      orgId: command.orgId,
      actor: AUDIT_ACTORS.anonymousViewer,
      action: AUDIT_ACTIONS.sessionCreated,
      targetType: AUDIT_TARGET_TYPES.fixture,
      targetId: fixture.fixtureId,
      details: { templateId: command.templateId, speed: command.speed },
    });
  }
}

const sessionMatch = (key: FixtureKey) =>
  and(eq(s.orgId, key.orgId), eq(s.fixtureId, key.fixtureId));

const idleStatus = (fixtureId: string, speed: ReplayStatus['speed']) => ({
  fixtureId,
  state: 'IDLE' as const,
  speed,
  appliedSequence: -1,
  period: null,
  matchClockMs: 0,
});
