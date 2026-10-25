import type {
  AgentStepTrace,
  CursorPageQuery,
  EvidenceEnvelope,
  Insight,
  MatchSnapshot,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import { and, asc, eq, isNull } from 'drizzle-orm';
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
  groupRuns,
  insightColumns,
  onAir,
  overlayColumns,
  overlayOf,
  scoped,
  toOverlay,
  toTrace,
  traceColumns,
  withInsightStatus,
} from './intelligence-rows.js';
import { readAgentStepTrace } from './agent-step-store.js';
import { PostgresMatchPages } from './match-pages.js';
import { withTenant } from './tenant-scope.js';
import {
  agentRuns,
  insights,
  matchRecaps,
  matchSnapshots,
  narratives,
  overlayCues,
} from '../schema/intelligence-tables.js';

export class PostgresIntelligenceReader implements IntelligenceReader {
  private readonly pages: PostgresMatchPages;

  constructor(private readonly db: Database) {
    this.pages = new PostgresMatchPages(db);
  }

  insightPage(key: FixtureKey, query: CursorPageQuery) {
    return this.pages.insights(key, query);
  }

  narrativePage(
    key: FixtureKey,
    filter: NarrativeFilter,
    query: CursorPageQuery,
  ) {
    return this.pages.narratives(key, filter, query);
  }

  overlayPage(key: FixtureKey, query: CursorPageQuery) {
    return this.pages.overlays(key, query);
  }

  tracePage(key: FixtureKey, query: CursorPageQuery) {
    return this.pages.traces(key, query);
  }

  async insightEvidence(
    orgId: string,
    insightId: string,
  ): Promise<EvidenceEnvelope | null> {
    const [row] = await withTenant(this.db, orgId, (tx) =>
      tx
        .select({ payload: insights.payload })
        .from(insights)
        .where(
          and(eq(insights.orgId, orgId), eq(insights.insightId, insightId)),
        ),
    );
    return row?.payload.evidence ?? null;
  }

  stepTrace(
    orgId: string,
    correlationId: string,
  ): Promise<AgentStepTrace | null> {
    return readAgentStepTrace(this.db, orgId, correlationId);
  }

  async latestSnapshot(key: FixtureKey): Promise<MatchSnapshot | null> {
    const [row] = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ payload: matchSnapshots.payload })
        .from(matchSnapshots)
        .where(scoped(matchSnapshots, key)),
    );
    return row?.payload ?? null;
  }

  async insights(key: FixtureKey): Promise<Insight[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select(insightColumns)
        .from(insights)
        .where(scoped(insights, key))
        .orderBy(asc(insights.detectedSequence), asc(insights.createdAt)),
    );
    return rows.map(withInsightStatus);
  }

  async insightsWithPeriod(key: FixtureKey): Promise<InsightWithPeriod[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({
          ...insightColumns,
          editorialState: insights.editorialState,
          editorialReason: insights.editorialReason,
        })
        .from(insights)
        .where(scoped(insights, key))
        .orderBy(asc(insights.detectedSequence), asc(insights.createdAt)),
    );
    return rows.map((row) => ({
      insight: withInsightStatus(row),
      period: row.period,
      ...(row.editorialState === 'RETRACTED'
        ? { retraction: { reason: row.editorialReason ?? 'CORRECTION' } }
        : {}),
    }));
  }

  async pendingInsight(
    key: FixtureKey,
    insightId: string,
  ): Promise<Insight | null> {
    const [row] = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select(insightColumns)
        .from(insights)
        .where(
          and(
            scoped(insights, key),
            eq(insights.insightId, insightId),
            eq(insights.publication, 'PENDING'),
            isNull(insights.editorialState),
          ),
        ),
    );
    return row ? withInsightStatus(row) : null;
  }

  async narratives(
    key: FixtureKey,
    filter: NarrativeFilter,
  ): Promise<Narrative[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
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
            isNull(narratives.retractedAt),
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
        ),
    );
    return rows.map((r) => r.payload);
  }

  async overlays(key: FixtureKey): Promise<OverlayCue[]> {
    const rows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select(overlayColumns)
        .from(overlayCues)
        .where(and(scoped(overlayCues, key), onAir()))
        .orderBy(
          asc(overlayCues.publishedSequence),
          asc(overlayCues.overlayId),
        ),
    );
    return rows.map(toOverlay);
  }

  async recap(key: FixtureKey): Promise<RecapDocument | null> {
    const [row] = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ payload: matchRecaps.payload })
        .from(matchRecaps)
        .where(scoped(matchRecaps, key)),
    );
    return row?.payload ?? null;
  }

  async traces(key: FixtureKey): Promise<InsightTrace[]> {
    const insightRows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select(traceColumns)
        .from(insights)
        .leftJoin(overlayCues, overlayOf())
        .where(scoped(insights, key))
        .orderBy(asc(insights.detectedSequence)),
    );
    const runRows = await withTenant(this.db, key.orgId, (tx) =>
      tx
        .select({ insightId: agentRuns.insightId, payload: agentRuns.payload })
        .from(agentRuns)
        .where(scoped(agentRuns, key))
        .orderBy(asc(agentRuns.createdAt)),
    );
    const runs = groupRuns(runRows);
    return insightRows.map((row) => toTrace(row, runs));
  }
}
