import { z } from 'zod';
import { AnalystBreakdown } from './breakdown.js';
import { LIMITS } from './constants.js';
import {
  EventId,
  FixtureId,
  InsightId,
  Locale,
  NarrativeId,
  Persona,
  SchemaVersion,
  UtcTimestamp,
} from './primitives.js';

export const NarrativeSource = z.enum(['AGENT', 'TEMPLATE']);

export const Narrative = z.strictObject({
  schemaVersion: SchemaVersion,
  narrativeId: NarrativeId,
  fixtureId: FixtureId,
  insightId: InsightId,
  persona: Persona,
  locale: Locale,
  headline: z.string().min(1).max(LIMITS.narrativeHeadlineMax),
  body: z.string().min(1).max(LIMITS.narrativeBodyMax),
  citations: z.array(EventId).min(1),
  source: NarrativeSource,
  /** Set when a localisation failed and the en-GB text is served instead. */
  localeFallback: z.boolean(),
  /** ANALYST only: the three-part breakdown (MQ-068). */
  breakdown: AnalystBreakdown.optional(),
  createdAt: UtcTimestamp,
});

export type NarrativeSource = z.infer<typeof NarrativeSource>;
export type Narrative = z.infer<typeof Narrative>;
