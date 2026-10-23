import { z } from 'zod';
import { CitedValue } from './agents.js';
import { LIMITS } from './constants.js';
import {
  EventId,
  InsightId,
  Locale,
  MetricRef,
  Persona,
} from './primitives.js';

/** One labelled part of the Analyst breakdown, with its own citations. */
export const BreakdownPart = z
  .strictObject({
    text: z.string().min(1).max(LIMITS.breakdownPartMax),
    citedValues: z.array(CitedValue),
    evidenceEventIds: z.array(EventId).min(1),
  })
  .meta({ id: 'BreakdownPart' });

/** ANALYST only (MQ-068): what happened, why it matters, what to watch. */
export const AnalystBreakdown = z
  .strictObject({
    whatHappened: BreakdownPart,
    whyItMatters: BreakdownPart,
    whatToWatch: BreakdownPart,
  })
  .meta({ id: 'AnalystBreakdown' });

export const StoryParagraphKind = z.enum([
  'FIRST_HALF',
  'SECOND_HALF',
  'TURNING_POINTS',
  'FULL_TIME',
]);

/** A cited number in the match story; `insightId` scopes it to one moment's metrics. */
export const StoryCitation = z.strictObject({
  metricRef: MetricRef,
  value: z.number(),
  insightId: InsightId.optional(),
});

export const StoryParagraph = z.strictObject({
  kind: StoryParagraphKind,
  text: z.string().min(1).max(LIMITS.storyParagraphMax),
  citedValues: z.array(StoryCitation),
  eventIds: z.array(EventId),
  insightIds: z.array(InsightId),
});

/** The deterministic full-time story for one audience and language. */
export const MatchStory = z.strictObject({
  persona: Persona,
  locale: Locale,
  paragraphs: z.array(StoryParagraph).min(1).max(LIMITS.storyParagraphsMax),
});

export type BreakdownPart = z.infer<typeof BreakdownPart>;
export type AnalystBreakdown = z.infer<typeof AnalystBreakdown>;
export type StoryParagraphKind = z.infer<typeof StoryParagraphKind>;
export type StoryCitation = z.infer<typeof StoryCitation>;
export type StoryParagraph = z.infer<typeof StoryParagraph>;
export type MatchStory = z.infer<typeof MatchStory>;
