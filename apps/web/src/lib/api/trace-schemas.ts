import {
  AgentRun,
  InsightKind,
  Locale,
  NarrativeSource,
  Persona,
  PipelineStatus,
} from '@matchiq/contracts';
import { z } from 'zod';
import { itemsOf } from './session-schemas';

/** `GET /fixtures/:id/agent-runs` for the Agent Observatory; local until contracted. */
export const GateRejection = z.object({
  item: z.enum(['NARRATIVE', 'OVERLAY']),
  source: NarrativeSource,
  persona: Persona.optional(),
  locale: Locale.optional(),
  codes: z.array(z.string()),
  details: z.array(z.string()),
});

export const GateReport = z.object({
  source: NarrativeSource,
  publishedNarratives: z.int().nonnegative(),
  templateNarratives: z.int().nonnegative(),
  overlayRevision: z.int().nullable(),
  rejected: z.array(GateRejection),
});

export const InsightPublication = z.enum(['PENDING', 'AGENT', 'TEMPLATE']);

export const InsightTrace = z.object({
  insightId: z.string(),
  kind: InsightKind,
  matchClockMs: z.int().nonnegative(),
  status: PipelineStatus,
  publication: InsightPublication,
  fallbackReason: z.string().nullable(),
  gate: GateReport.nullable(),
  runs: z.array(AgentRun),
});

export const TraceList = itemsOf(InsightTrace);

export type GateRejection = z.output<typeof GateRejection>;
export type GateReport = z.output<typeof GateReport>;
export type InsightPublication = z.output<typeof InsightPublication>;
export type InsightTrace = z.output<typeof InsightTrace>;
