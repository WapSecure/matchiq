import { FixtureId } from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS } from '../constants';

const limit = (fallback: number, max: number) =>
  z.coerce.number().int().min(1).max(max).default(fallback);

export const FixtureListQuery = z.strictObject({
  limit: limit(API_LIMITS.fixtureListDefault, API_LIMITS.fixtureListMax),
});

export const EventPageQuery = z.strictObject({
  afterSequence: z.coerce.number().int().min(-1).default(-1),
  limit: limit(API_LIMITS.eventPageDefault, API_LIMITS.eventPageMax),
});

export const StreamQuery = z.strictObject({
  lastEventId: z.coerce.number().int().nonnegative().optional(),
});

export const FixtureIdParam = FixtureId;

export type FixtureListQuery = z.infer<typeof FixtureListQuery>;
export type EventPageQuery = z.infer<typeof EventPageQuery>;
export type StreamQuery = z.infer<typeof StreamQuery>;
