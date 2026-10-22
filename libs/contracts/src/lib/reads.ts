import { z } from 'zod';
import { AgentRun, VerificationIssueCode } from './agents.js';
import { MatchEvent } from './events.js';
import {
  Insight,
  InsightKind,
  InsightPriority,
  PipelineStatus,
} from './insight.js';
import { ItemList } from './lobby.js';
import { Narrative, NarrativeSource } from './narrative.js';
import { OverlayCue } from './overlay.js';
import {
  ConfidenceLabel,
  FixtureId,
  InsightId,
  Locale,
  MatchClockMs,
  Period,
  Persona,
  PlayerId,
  TeamId,
} from './primitives.js';
import { MatchSnapshot } from './snapshot.js';

/** `GET /fixtures/:id/events`: sequence-ordered, keyset-paginated by `afterSequence`. */
export const EventPage = z.strictObject({
  items: z.array(MatchEvent),
  /** Pass as `afterSequence` for the next page; null when this page is the last. */
  nextAfterSequence: z.int().min(-1).nullable(),
});

export const InsightList = ItemList(Insight);
export const NarrativeList = ItemList(Narrative);
export const OverlayList = ItemList(OverlayCue);

export const RecapNarrative = z.strictObject({
  persona: Persona,
  locale: Locale,
  headline: z.string().min(1),
  body: z.string().min(1),
  source: NarrativeSource,
  citations: z.array(z.string()),
});

export const RecapMoment = z.strictObject({
  insightId: InsightId,
  kind: InsightKind,
  priority: InsightPriority,
  period: Period,
  matchClockMs: MatchClockMs,
  teamId: TeamId.optional(),
  playerId: PlayerId.optional(),
  reasonCode: z.string().min(1),
  confidenceLabel: ConfidenceLabel,
  evidenceEventIds: z.array(z.string()),
  metricRefs: z.array(z.string()),
  narratives: z.array(RecapNarrative),
});

/** Built once at full time from published outputs; numbers come from `finalSnapshot`. */
export const RecapDocument = z.strictObject({
  schemaVersion: z.literal(1),
  fixtureId: FixtureId,
  title: z.string().min(1),
  finalSnapshot: MatchSnapshot,
  keyMoments: z.array(RecapMoment),
  synthetic: z.literal(true),
});

export const GateIssueCode = z.enum([
  ...VerificationIssueCode.options,
  'UNREQUESTED_VARIANT',
]);

export const GateRejection = z.strictObject({
  item: z.enum(['NARRATIVE', 'OVERLAY']),
  source: NarrativeSource,
  persona: Persona.optional(),
  locale: Locale.optional(),
  codes: z.array(GateIssueCode),
  details: z.array(z.string()),
});

/** The worker's deterministic publish gate verdict for one insight. */
export const GateReport = z.strictObject({
  source: NarrativeSource,
  publishedNarratives: z.int().nonnegative(),
  templateNarratives: z.int().nonnegative(),
  overlayRevision: z.int().nullable(),
  rejected: z.array(GateRejection),
});

export const InsightPublication = z.enum(['PENDING', 'AGENT', 'TEMPLATE']);

/** RETRACTED: pulled after airing. HELD: frozen or killed. SUPPRESSED: its insight was suppressed. */
export const OverlayEditorialState = z.enum([
  'RETRACTED',
  'HELD',
  'SUPPRESSED',
]);
export const InsightEditorialState = z.enum(['SUPPRESSED']);

export const InsightEditorialTrace = z.strictObject({
  insight: InsightEditorialState.nullable(),
  insightReason: z.string().nullable(),
  overlay: OverlayEditorialState.nullable(),
  overlayReason: z.string().nullable(),
});

/** `GET /fixtures/:id/agent-runs`: one insight's path through agents, gate and editorial policy. */
export const InsightTrace = z.strictObject({
  insightId: InsightId,
  kind: InsightKind,
  matchClockMs: MatchClockMs,
  status: PipelineStatus,
  publication: InsightPublication,
  fallbackReason: z.string().nullable(),
  gate: GateReport.nullable(),
  runs: z.array(AgentRun),
  editorial: InsightEditorialTrace,
});

export const InsightTraceList = ItemList(InsightTrace);

export type EventPage = z.infer<typeof EventPage>;
export type InsightList = z.infer<typeof InsightList>;
export type NarrativeList = z.infer<typeof NarrativeList>;
export type OverlayList = z.infer<typeof OverlayList>;
export type RecapNarrative = z.infer<typeof RecapNarrative>;
export type RecapMoment = z.infer<typeof RecapMoment>;
export type RecapDocument = z.infer<typeof RecapDocument>;
export type GateIssueCode = z.infer<typeof GateIssueCode>;
export type GateRejection = z.infer<typeof GateRejection>;
export type GateReport = z.infer<typeof GateReport>;
export type InsightPublication = z.infer<typeof InsightPublication>;
export type OverlayEditorialState = z.infer<typeof OverlayEditorialState>;
export type InsightEditorialState = z.infer<typeof InsightEditorialState>;
export type InsightEditorialTrace = z.infer<typeof InsightEditorialTrace>;
export type InsightTrace = z.infer<typeof InsightTrace>;
export type InsightTraceList = z.infer<typeof InsightTraceList>;
