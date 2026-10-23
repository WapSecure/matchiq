import {
  ConfidenceLabel,
  Fixture,
  Insight,
  InsightKind,
  InsightPriority,
  MatchSnapshot,
  Narrative,
  OverlayCue,
  RecapNarrative as RecapNarrativeSchema,
  ReplayStatus,
} from '@matchiq/contracts';
import { z } from 'zod';

/**
 * Lobby, session and recap shapes the API serves from `libs/db` local types
 * (ADR-0013). Local until `libs/contracts` exports them.
 */
const TeamSummary = z.object({
  teamId: z.string(),
  name: z.string(),
  shortName: z.string(),
  colors: z.object({ primary: z.string(), secondary: z.string() }),
});

export const FixtureTemplateSummary = z.object({
  templateId: z.string(),
  title: z.string(),
  competitionLabel: z.string(),
  scenario: z.string(),
  seed: z.int(),
  eventCount: z.int().nonnegative(),
  eventsHash: z.string(),
  finalScore: z.object({ home: z.int(), away: z.int() }),
  home: TeamSummary,
  away: TeamSummary,
});

export const ReplaySessionView = z.object({
  sessionId: z.string(),
  templateId: z.string(),
  sessionNumber: z.int().positive(),
  title: z.string(),
  status: ReplayStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreatedSession = z.object({
  fixture: Fixture,
  session: ReplaySessionView,
});

export const RecapMoment = z.object({
  insightId: z.string(),
  kind: InsightKind,
  priority: InsightPriority,
  period: z.int(),
  matchClockMs: z.int().nonnegative(),
  teamId: z.string().optional(),
  playerId: z.string().optional(),
  reasonCode: z.string(),
  confidenceLabel: ConfidenceLabel,
  evidenceEventIds: z.array(z.string()),
  metricRefs: z.array(z.string()),
  narratives: z.array(RecapNarrativeSchema),
  retracted: z.object({ reason: z.string() }).optional(),
});

export const RecapDocument = z.object({
  schemaVersion: z.literal(1),
  fixtureId: z.string(),
  title: z.string(),
  finalSnapshot: MatchSnapshot,
  keyMoments: z.array(RecapMoment),
  synthetic: z.literal(true),
});

/** Validates a `{ items }` list response and unwraps it for callers. */
export const itemsOf = <S extends z.ZodType>(item: S) =>
  z.object({ items: z.array(item) }).transform((page) => page.items);

/** One page of a keyset list. Older `{ items }` replies read as a single last page. */
export const cursorPageOf = <S extends z.ZodType>(item: S) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable().default(null),
    total: z.int().nonnegative().optional(),
  });

export const TemplatePage = cursorPageOf(FixtureTemplateSummary);
export const SessionPage = cursorPageOf(ReplaySessionView);
export const InsightList = itemsOf(Insight);
export const NarrativeList = itemsOf(Narrative);
export const OverlayList = itemsOf(OverlayCue);

export type FixtureTemplateSummary = z.output<typeof FixtureTemplateSummary>;
export type ReplaySessionView = z.output<typeof ReplaySessionView>;
export type CreatedSession = z.output<typeof CreatedSession>;
export type RecapNarrative = z.output<typeof RecapNarrativeSchema>;
export type RecapMoment = z.output<typeof RecapMoment>;
export type RecapDocument = z.output<typeof RecapDocument>;
export type SessionPage = z.infer<typeof SessionPage>;
