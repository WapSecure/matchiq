import {
  OverlayStatus,
  PipelineStatus,
  type AgentRun,
  type Insight,
  type OverlayCue,
} from '@matchiq/contracts';
import { and, eq, isNull, notInArray, or, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { OverlayEditorialState } from '../editorial-types.js';
import type { InsightTrace } from '../intelligence-types.js';
import type { FixtureKey } from '../ports.js';
import { insights, overlayCues } from '../schema/intelligence-tables.js';

export const scoped = (
  table: { orgId: PgColumn; fixtureId: PgColumn },
  key: FixtureKey,
): SQL | undefined =>
  and(eq(table.orgId, key.orgId), eq(table.fixtureId, key.fixtureId));

export const insightColumns = {
  payload: insights.payload,
  status: insights.status,
  period: insights.period,
};

/**
 * Status and period columns are authoritative; payloads keep the values first
 * published, and those stored before MQ-024 have no `period`.
 */
export const withInsightStatus = (row: {
  payload: Insight;
  status: string;
  period: number;
}): Insight => ({
  ...row.payload,
  period: row.period,
  status: PipelineStatus.parse(row.status),
});

const NEVER_AIRED: OverlayEditorialState[] = [
  'HELD',
  'SUPPRESSED',
  'AWAITING_APPROVAL',
  'REJECTED',
  'APPROVAL_EXPIRED',
];

/** Held, suppressed and unapproved cues never aired; viewers see only what went on air. */
export const onAir = (): SQL | undefined =>
  or(
    isNull(overlayCues.editorialState),
    notInArray(overlayCues.editorialState, NEVER_AIRED),
  );

export const overlayColumns = {
  payload: overlayCues.payload,
  status: overlayCues.status,
};

export const toOverlay = (row: {
  payload: OverlayCue;
  status: string;
}): OverlayCue => ({
  ...row.payload,
  status: OverlayStatus.parse(row.status),
});

export const groupRuns = (
  rows: { insightId: string; payload: AgentRun }[],
): Map<string, AgentRun[]> => {
  const byInsight = new Map<string, AgentRun[]>();
  for (const row of rows) {
    const list = byInsight.get(row.insightId) ?? [];
    list.push(row.payload);
    byInsight.set(row.insightId, list);
  }
  return byInsight;
};

export const traceColumns = {
  insightId: insights.insightId,
  matchClockMs: insights.matchClockMs,
  status: insights.status,
  publication: insights.publication,
  fallbackReason: insights.fallbackReason,
  gate: insights.gateReport,
  payload: insights.payload,
  insightState: insights.editorialState,
  insightReason: insights.editorialReason,
  overlayState: overlayCues.editorialState,
  overlayReason: overlayCues.editorialReason,
};

export type TraceRow = {
  insightId: string;
  matchClockMs: number;
  status: string;
  publication: InsightTrace['publication'];
  fallbackReason: string | null;
  gate: InsightTrace['gate'];
  payload: Insight;
  insightState: InsightTrace['editorial']['insight'];
  insightReason: string | null;
  overlayState: InsightTrace['editorial']['overlay'];
  overlayReason: string | null;
};

export const toTrace = (
  row: TraceRow,
  runs: Map<string, AgentRun[]>,
): InsightTrace => ({
  insightId: row.insightId,
  kind: row.payload.kind,
  matchClockMs: row.matchClockMs,
  status: PipelineStatus.parse(row.status),
  publication: row.publication,
  fallbackReason: row.fallbackReason,
  gate: row.gate,
  runs: runs.get(row.insightId) ?? [],
  editorial: {
    insight: row.insightState,
    insightReason: row.insightReason,
    overlay: row.overlayState,
    overlayReason: row.overlayReason,
  },
});

/** Pairs an insight with its overlay cue, for traces. */
export const overlayOf = (): SQL | undefined =>
  and(
    eq(overlayCues.orgId, insights.orgId),
    eq(overlayCues.fixtureId, insights.fixtureId),
    eq(overlayCues.insightId, insights.insightId),
  );
