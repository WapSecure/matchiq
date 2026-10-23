import { z } from 'zod';
import { PATTERNS } from './constants.js';
import { FaultPlan } from './faults.js';
import { Fixture, Team } from './fixture.js';
import { FixtureId, TeamId, UtcTimestamp } from './primitives.js';
import { ReplayStatus } from './replay.js';

/** `{ items }` envelope for unpaginated collections (bounded server-side). */
export const ItemList = <T extends z.ZodType>(item: T) =>
  z.strictObject({ items: z.array(item) });

export type ItemList<T> = { items: T[] };

export const FixtureList = ItemList(Fixture);

export const TeamSummary = z.strictObject({
  teamId: TeamId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  colors: Team.shape.colors,
});

export const FinalScore = z.strictObject({
  home: z.int().nonnegative(),
  away: z.int().nonnegative(),
});

/** A replayable fixture in the lobby: one recorded synthetic match. */
export const FixtureTemplateSummary = z.strictObject({
  templateId: FixtureId,
  title: z.string().min(1),
  competitionLabel: z.string().min(1),
  scenario: z.string().min(1),
  seed: z.int().nonnegative(),
  eventCount: z.int().nonnegative(),
  eventsHash: z.string().regex(PATTERNS.sha256Hex),
  finalScore: FinalScore,
  home: TeamSummary,
  away: TeamSummary,
});

export const ReplaySessionView = z.strictObject({
  sessionId: FixtureId,
  templateId: FixtureId,
  sessionNumber: z.int().positive(),
  title: z.string().min(1),
  status: ReplayStatus,
  createdAt: UtcTimestamp,
  updatedAt: UtcTimestamp,
  /** Present only on demo sessions created with simulated failures (ADR-0020). */
  faultPlan: FaultPlan.optional(),
});

/** `201` of `POST /fixtures/:templateId/sessions`: the session's own fixture and view. */
export const CreatedSession = z.strictObject({
  fixture: Fixture,
  session: ReplaySessionView,
});

export const FixtureTemplateList = ItemList(FixtureTemplateSummary);
export const ReplaySessionList = ItemList(ReplaySessionView);

export type FixtureList = z.infer<typeof FixtureList>;
export type TeamSummary = z.infer<typeof TeamSummary>;
export type FinalScore = z.infer<typeof FinalScore>;
export type FixtureTemplateSummary = z.infer<typeof FixtureTemplateSummary>;
export type ReplaySessionView = z.infer<typeof ReplaySessionView>;
export type CreatedSession = z.infer<typeof CreatedSession>;
export type FixtureTemplateList = z.infer<typeof FixtureTemplateList>;
export type ReplaySessionList = z.infer<typeof ReplaySessionList>;
