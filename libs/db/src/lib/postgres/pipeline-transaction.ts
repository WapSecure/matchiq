import type {
  InsightRetraction,
  MatchSnapshot,
  Narrative,
  ReplayStatus,
} from '@matchiq/contracts';
import { and, eq, isNull, max, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '../client.js';
import type {
  InsightCompletion,
  InsightPublication,
  InsightRecord,
  OverlayEndWrite,
  OverlayRecord,
  PipelineTransaction,
  PipelineUnitOfWork,
  RecapDocument,
  SessionProgress,
} from '../intelligence-types.js';
import type { EditorialView } from '../editorial-types.js';
import type { FixtureKey } from '../ports.js';
import {
  insights,
  narratives,
  overlayCues,
} from '../schema/intelligence-tables.js';
import { matchEvents } from '../schema/tables.js';
import { insertAgentRuns, insertAgentSteps } from './agent-step-store.js';
import { readEditorialView } from './editorial-queries.js';
import { PostgresLedgerTransaction } from './ledger-transaction.js';
import * as writes from './read-model-writes.js';
import { retractInsight } from './retraction-writes.js';

const scoped = (
  table: { orgId: PgColumn; fixtureId: PgColumn },
  key: FixtureKey,
) => and(eq(table.orgId, key.orgId), eq(table.fixtureId, key.fixtureId));

class PostgresPipelineTransaction
  extends PostgresLedgerTransaction
  implements PipelineTransaction
{
  async ledgerHead(key: FixtureKey): Promise<number> {
    await this.pin.to(key.orgId);
    const [row] = await this.tx
      .select({ head: max(matchEvents.sequence) })
      .from(matchEvents)
      .where(
        and(
          eq(matchEvents.orgId, key.orgId),
          eq(matchEvents.fixtureId, key.fixtureId),
        ),
      );
    return row?.head ?? -1;
  }

  async insertInsights(
    key: FixtureKey,
    rows: readonly InsightRecord[],
  ): Promise<void> {
    await this.pin.to(key.orgId);
    if (rows.length === 0) return;
    await this.tx
      .insert(insights)
      .values(
        rows.map((r) => ({
          orgId: key.orgId,
          fixtureId: key.fixtureId,
          insightId: r.insight.insightId,
          revision: r.revision,
          kind: r.insight.kind,
          priority: r.insight.priority,
          period: r.period,
          matchClockMs: r.insight.matchClockMs,
          status: r.insight.status,
          publication: r.publication,
          payload: r.insight,
          detectedSequence: r.detectedSequence,
        })),
      )
      .onConflictDoNothing();
  }

  async claimPublication(
    key: FixtureKey,
    insightId: string,
    publication: Exclude<InsightPublication, 'PENDING'>,
  ): Promise<boolean> {
    await this.pin.to(key.orgId);
    const rows = await this.tx
      .update(insights)
      .set({ publication, updatedAt: sql`now()` })
      .where(
        and(
          scoped(insights, key),
          eq(insights.insightId, insightId),
          eq(insights.publication, 'PENDING'),
          isNull(insights.editorialState),
        ),
      )
      .returning({ insightId: insights.insightId });
    return rows.length > 0;
  }

  async completeInsight(
    key: FixtureKey,
    insightId: string,
    completion: InsightCompletion,
  ): Promise<void> {
    await this.pin.to(key.orgId);
    await this.tx
      .update(insights)
      .set({
        status: completion.status,
        gateReport: completion.gateReport,
        fallbackReason: completion.fallbackReason ?? null,
        updatedAt: sql`now()`,
      })
      .where(and(scoped(insights, key), eq(insights.insightId, insightId)));
  }

  async insertNarratives(
    key: FixtureKey,
    items: readonly Narrative[],
  ): Promise<void> {
    await this.pin.to(key.orgId);
    if (items.length === 0) return;
    await this.tx
      .insert(narratives)
      .values(
        items.map((n) => ({
          orgId: key.orgId,
          fixtureId: key.fixtureId,
          narrativeId: n.narrativeId,
          insightId: n.insightId,
          persona: n.persona,
          locale: n.locale,
          source: n.source,
          revision: 1,
          payload: n,
        })),
      )
      .onConflictDoNothing();
  }

  async upsertOverlay(key: FixtureKey, record: OverlayRecord): Promise<void> {
    await this.pin.to(key.orgId);
    const { cue } = record;
    const values = {
      revision: cue.revision,
      status: record.status,
      priority: cue.priority,
      period: record.period,
      clockStartMs: cue.clockStartMs,
      clockEndMs: cue.clockEndMs,
      payload: cue,
      publishedSequence: record.publishedSequence,
      editorialState: record.editorial?.state ?? null,
      editorialReason: record.editorial?.reason ?? null,
    };
    await this.tx
      .insert(overlayCues)
      .values({
        orgId: key.orgId,
        fixtureId: key.fixtureId,
        overlayId: cue.overlayId,
        insightId: cue.insightId ?? null,
        ...values,
      })
      .onConflictDoUpdate({
        target: [
          overlayCues.orgId,
          overlayCues.fixtureId,
          overlayCues.overlayId,
        ],
        set: { ...values, updatedAt: sql`now()` },
      });
  }

  async endOverlay(
    key: FixtureKey,
    overlayId: string,
    end: OverlayEndWrite,
  ): Promise<void> {
    await this.pin.to(key.orgId);
    return writes.endOverlay(this.tx, key, overlayId, end);
  }

  editorialView(
    key: FixtureKey,
    overlayIds: readonly string[],
    insightIds: readonly string[],
  ): Promise<EditorialView> {
    return readEditorialView(this.tx, key, { overlayIds, insightIds });
  }

  insertAgentRuns: PipelineTransaction['insertAgentRuns'] = async (
    key,
    insightId,
    runs,
  ) => {
    await this.pin.to(key.orgId);
    return insertAgentRuns(this.tx, key, insightId, runs);
  };

  insertAgentSteps: PipelineTransaction['insertAgentSteps'] = async (
    key,
    insightId,
    steps,
  ) => {
    await this.pin.to(key.orgId);
    return insertAgentSteps(this.tx, key, insightId, steps);
  };

  async saveSnapshot(key: FixtureKey, snapshot: MatchSnapshot): Promise<void> {
    await this.pin.to(key.orgId);
    return writes.saveSnapshot(this.tx, key, snapshot);
  }

  async updateSession(key: FixtureKey, status: ReplayStatus): Promise<void> {
    await this.pin.to(key.orgId);
    return writes.updateSession(this.tx, key, status);
  }

  async updateSessionProgress(
    key: FixtureKey,
    progress: SessionProgress,
  ): Promise<void> {
    await this.pin.to(key.orgId);
    return writes.updateSessionProgress(this.tx, key, progress);
  }

  async saveRecap(key: FixtureKey, recap: RecapDocument): Promise<void> {
    await this.pin.to(key.orgId);
    return writes.saveRecap(this.tx, key, recap);
  }

  async retractInsight(
    key: FixtureKey,
    retraction: InsightRetraction,
  ): Promise<boolean> {
    await this.pin.to(key.orgId);
    return retractInsight(this.tx, key, retraction);
  }
}

export class PostgresPipelineUnitOfWork implements PipelineUnitOfWork {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: PipelineTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) =>
      work(new PostgresPipelineTransaction(tx)),
    );
  }
}
