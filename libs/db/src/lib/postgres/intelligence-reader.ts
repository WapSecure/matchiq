import {
  OverlayStatus,
  PipelineStatus,
  type AgentRun,
  type Insight,
  type MatchSnapshot,
  type Narrative,
  type OverlayCue,
} from '@matchiq/contracts';
import { and, asc, eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '../client.js';
import type {
  InsightTrace,
  InsightWithPeriod,
  IntelligenceReader,
  NarrativeFilter,
  RecapDocument,
} from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';
import {
  agentRuns,
  insights,
  matchRecaps,
  matchSnapshots,
  narratives,
  overlayCues,
} from '../schema/intelligence-tables.js';

const scoped = (
  table: { orgId: PgColumn; fixtureId: PgColumn },
  key: FixtureKey,
): SQL | undefined =>
  and(eq(table.orgId, key.orgId), eq(table.fixtureId, key.fixtureId));

const insightColumns = {
  payload: insights.payload,
  status: insights.status,
  period: insights.period,
};

/**
 * Status and period columns are authoritative; payloads keep the values first
 * published, and those stored before MQ-024 have no `period`.
 */
const withInsightStatus = (row: {
  payload: Insight;
  status: string;
  period: number;
}): Insight => ({
  ...row.payload,
  period: row.period,
  status: PipelineStatus.parse(row.status),
});

const groupRuns = (rows: { insightId: string; payload: AgentRun }[]) => {
  const byInsight = new Map<string, AgentRun[]>();
  for (const row of rows) {
    const list = byInsight.get(row.insightId) ?? [];
    list.push(row.payload);
    byInsight.set(row.insightId, list);
  }
  return byInsight;
};

export class PostgresIntelligenceReader implements IntelligenceReader {
  constructor(private readonly db: Database) {}

  async latestSnapshot(key: FixtureKey): Promise<MatchSnapshot | null> {
    const [row] = await this.db
      .select({ payload: matchSnapshots.payload })
      .from(matchSnapshots)
      .where(scoped(matchSnapshots, key));
    return row?.payload ?? null;
  }

  async insights(key: FixtureKey): Promise<Insight[]> {
    const rows = await this.db
      .select(insightColumns)
      .from(insights)
      .where(scoped(insights, key))
      .orderBy(asc(insights.detectedSequence), asc(insights.createdAt));
    return rows.map(withInsightStatus);
  }

  async insightsWithPeriod(key: FixtureKey): Promise<InsightWithPeriod[]> {
    const rows = await this.db
      .select(insightColumns)
      .from(insights)
      .where(scoped(insights, key))
      .orderBy(asc(insights.detectedSequence), asc(insights.createdAt));
    return rows.map((row) => ({
      insight: withInsightStatus(row),
      period: row.period,
    }));
  }

  async pendingInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<Insight | null> {
    const [row] = await this.db
      .select(insightColumns)
      .from(insights)
      .where(
        and(
          scoped(insights, key),
          eq(insights.insightId, insightId),
          eq(insights.publication, 'PENDING'),
        ),
      );
    return row ? withInsightStatus(row) : null;
  }

  async narratives(
    key: FixtureKey,
    filter: NarrativeFilter,
  ): Promise<Narrative[]> {
    const rows = await this.db
      .select({ payload: narratives.payload })
      .from(narratives)
      .innerJoin(
        insights,
        and(
          eq(insights.orgId, narratives.orgId),
          eq(insights.fixtureId, narratives.fixtureId),
          eq(insights.insightId, narratives.insightId),
        ),
      )
      .where(
        and(
          scoped(narratives, key),
          filter.persona === undefined
            ? undefined
            : eq(narratives.persona, filter.persona),
          filter.locale === undefined
            ? undefined
            : eq(narratives.locale, filter.locale),
        ),
      )
      .orderBy(
        asc(insights.detectedSequence),
        asc(narratives.persona),
        asc(narratives.locale),
      );
    return rows.map((r) => r.payload);
  }

  async overlays(key: FixtureKey): Promise<OverlayCue[]> {
    const rows = await this.db
      .select({ payload: overlayCues.payload, status: overlayCues.status })
      .from(overlayCues)
      .where(scoped(overlayCues, key))
      .orderBy(asc(overlayCues.publishedSequence), asc(overlayCues.overlayId));
    return rows.map((r) => ({
      ...r.payload,
      status: OverlayStatus.parse(r.status),
    }));
  }

  async recap(key: FixtureKey): Promise<RecapDocument | null> {
    const [row] = await this.db
      .select({ payload: matchRecaps.payload })
      .from(matchRecaps)
      .where(scoped(matchRecaps, key));
    return row?.payload ?? null;
  }

  async traces(key: FixtureKey): Promise<InsightTrace[]> {
    const insightRows = await this.db
      .select({
        insightId: insights.insightId,
        matchClockMs: insights.matchClockMs,
        status: insights.status,
        publication: insights.publication,
        fallbackReason: insights.fallbackReason,
        gate: insights.gateReport,
        payload: insights.payload,
      })
      .from(insights)
      .where(scoped(insights, key))
      .orderBy(asc(insights.detectedSequence));
    const runRows = await this.db
      .select({ insightId: agentRuns.insightId, payload: agentRuns.payload })
      .from(agentRuns)
      .where(scoped(agentRuns, key))
      .orderBy(asc(agentRuns.createdAt));
    const runs = groupRuns(runRows);
    return insightRows.map((row) => ({
      insightId: row.insightId,
      kind: row.payload.kind,
      matchClockMs: row.matchClockMs,
      status: PipelineStatus.parse(row.status),
      publication: row.publication,
      fallbackReason: row.fallbackReason,
      gate: row.gate,
      runs: runs.get(row.insightId) ?? [],
    }));
  }
}
