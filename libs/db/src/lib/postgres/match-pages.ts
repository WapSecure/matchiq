import type {
  CursorPage,
  CursorPageQuery,
  Insight,
  Narrative,
  OverlayCue,
} from '@matchiq/contracts';
import { and, asc, count, eq, inArray, type SQL } from 'drizzle-orm';
import { PAGE_CURSOR } from '../constants.js';
import type { Database, Transaction } from '../client.js';
import type { InsightTrace, NarrativeFilter } from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';
import {
  agentRuns,
  insights,
  narratives,
  overlayCues,
} from '../schema/intelligence-tables.js';
import {
  groupRuns,
  onAir,
  overlayColumns,
  overlayOf,
  scoped,
  toOverlay,
  toTrace,
  type TraceRow,
  traceColumns,
  insightColumns,
  withInsightStatus,
} from './intelligence-rows.js';
import { keysetPage, type PageSpec } from './match-cursor.js';

const kinds = PAGE_CURSOR.kinds;

export class PostgresMatchPages {
  constructor(private readonly db: Database) {}

  private page<R, T>(
    key: FixtureKey,
    query: CursorPageQuery,
    spec: Omit<PageSpec<R, T>, 'key' | 'query'>,
  ): Promise<CursorPage<T>> {
    return keysetPage(this.db, { key, query, ...spec });
  }

  insights(key: FixtureKey, query: CursorPageQuery) {
    const where = scoped(insights, key);
    return this.page<{ seq: number; id: string; row: Insight }, Insight>(
      key,
      query,
      {
        kind: kinds.insights,
        shape: ['integer', 'text'],
        columns: [insights.detectedSequence, insights.insightId],
        read: async (tx, after, limit) => {
          const rows = await tx
            .select({
              ...insightColumns,
              seq: insights.detectedSequence,
              id: insights.insightId,
            })
            .from(insights)
            .where(and(where, after))
            .orderBy(asc(insights.detectedSequence), asc(insights.insightId))
            .limit(limit);
          return rows.map((r) => ({
            seq: r.seq,
            id: r.id,
            row: withInsightStatus(r),
          }));
        },
        total: (tx) => countOf(tx, insights, where),
        keyOf: (r) => [String(r.seq), r.id],
        item: (rows) => rows.map((r) => r.row),
      },
    );
  }

  narratives(key: FixtureKey, filter: NarrativeFilter, query: CursorPageQuery) {
    const where = and(
      scoped(narratives, key),
      filter.persona === undefined
        ? undefined
        : eq(narratives.persona, filter.persona),
      filter.locale === undefined
        ? undefined
        : eq(narratives.locale, filter.locale),
    );
    const joined = and(
      eq(insights.orgId, narratives.orgId),
      eq(insights.fixtureId, narratives.fixtureId),
      eq(insights.insightId, narratives.insightId),
    );
    type Row = {
      seq: number;
      persona: string;
      locale: string;
      id: string;
      payload: Narrative;
    };
    return this.page<Row, Narrative>(key, query, {
      kind: kinds.narratives,
      shape: ['integer', 'text', 'text', 'text'],
      columns: [
        insights.detectedSequence,
        narratives.persona,
        narratives.locale,
        narratives.narrativeId,
      ],
      read: (tx, after, limit) =>
        tx
          .select({
            seq: insights.detectedSequence,
            persona: narratives.persona,
            locale: narratives.locale,
            id: narratives.narrativeId,
            payload: narratives.payload,
          })
          .from(narratives)
          .innerJoin(insights, joined)
          .where(and(where, after))
          .orderBy(
            asc(insights.detectedSequence),
            asc(narratives.persona),
            asc(narratives.locale),
            asc(narratives.narrativeId),
          )
          .limit(limit),
      total: async (tx) => {
        const [row] = await tx
          .select({ n: count() })
          .from(narratives)
          .innerJoin(insights, joined)
          .where(where);
        return row?.n ?? 0;
      },
      keyOf: (r) => [String(r.seq), r.persona, r.locale, r.id],
      item: (rows) => rows.map((r) => r.payload),
    });
  }

  overlays(key: FixtureKey, query: CursorPageQuery) {
    const where = and(scoped(overlayCues, key), onAir());
    type Row = { seq: number; id: string; cue: OverlayCue };
    return this.page<Row, OverlayCue>(key, query, {
      kind: kinds.overlays,
      shape: ['integer', 'text'],
      columns: [overlayCues.publishedSequence, overlayCues.overlayId],
      read: async (tx, after, limit) => {
        const rows = await tx
          .select({
            ...overlayColumns,
            seq: overlayCues.publishedSequence,
            id: overlayCues.overlayId,
          })
          .from(overlayCues)
          .where(and(where, after))
          .orderBy(
            asc(overlayCues.publishedSequence),
            asc(overlayCues.overlayId),
          )
          .limit(limit);
        return rows.map((r) => ({ seq: r.seq, id: r.id, cue: toOverlay(r) }));
      },
      total: (tx) => countOf(tx, overlayCues, where),
      keyOf: (r) => [String(r.seq), r.id],
      item: (rows) => rows.map((r) => r.cue),
    });
  }

  /** One trace per insight; each page loads only the runs of its own insights. */
  traces(key: FixtureKey, query: CursorPageQuery) {
    const where = scoped(insights, key);
    return this.page<TraceRow & { seq: number }, InsightTrace>(key, query, {
      kind: kinds.traces,
      shape: ['integer', 'text'],
      columns: [insights.detectedSequence, insights.insightId],
      read: (tx, after, limit) =>
        // An insight can have several cues; the page keeps one row per insight.
        tx
          .selectDistinctOn([insights.detectedSequence, insights.insightId], {
            ...traceColumns,
            seq: insights.detectedSequence,
          })
          .from(insights)
          .leftJoin(overlayCues, overlayOf())
          .where(and(where, after))
          .orderBy(
            asc(insights.detectedSequence),
            asc(insights.insightId),
            asc(overlayCues.overlayId),
          )
          .limit(limit),
      total: (tx) => countOf(tx, insights, where),
      keyOf: (r) => [String(r.seq), r.insightId],
      item: async (rows, tx) => {
        const ids = rows.map((r) => r.insightId);
        const runRows =
          ids.length === 0
            ? []
            : await tx
                .select({
                  insightId: agentRuns.insightId,
                  payload: agentRuns.payload,
                })
                .from(agentRuns)
                .where(
                  and(
                    scoped(agentRuns, key),
                    inArray(agentRuns.insightId, ids),
                  ),
                )
                .orderBy(asc(agentRuns.createdAt), asc(agentRuns.id));
        const runs = groupRuns(runRows);
        return rows.map((r) => toTrace(r, runs));
      },
    });
  }
}

const countOf = async (
  tx: Transaction,
  table: typeof insights | typeof overlayCues,
  where: SQL | undefined,
): Promise<number> => {
  const [row] = await tx.select({ n: count() }).from(table).where(where);
  return row?.n ?? 0;
};
