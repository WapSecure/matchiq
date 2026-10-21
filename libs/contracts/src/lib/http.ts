import { z } from 'zod';
import { LIMITS } from './constants.js';
import { MatchEvent } from './events.js';
import { FixtureId, SchemaVersion } from './primitives.js';

/** RFC 9457 (formerly 7807) problem details. */
export const ProblemDetails = z.strictObject({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  requestId: z.string().optional(),
  errors: z
    .array(z.strictObject({ path: z.string(), message: z.string() }))
    .optional(),
});

export const IngestBatchRequest = z.strictObject({
  schemaVersion: SchemaVersion,
  fixtureId: FixtureId,
  events: z.array(MatchEvent).min(1).max(LIMITS.ingestBatchMax),
});

export const IngestBatchResponse = z.strictObject({
  accepted: z.int().nonnegative(),
  duplicates: z.int().nonnegative(),
  rejected: z.int().nonnegative(),
  ingestionId: z.string().min(1),
  lastAcceptedSequence: z.int().min(-1),
});

export const HealthStatus = z.strictObject({
  status: z.enum(['ok', 'degraded', 'unavailable']),
  service: z.string().min(1),
  version: z.string().min(1),
  checks: z.record(
    z.string(),
    z.strictObject({
      status: z.enum(['ok', 'degraded', 'unavailable']),
      detail: z.string().optional(),
    }),
  ),
});

export type ProblemDetails = z.infer<typeof ProblemDetails>;
export type IngestBatchRequest = z.infer<typeof IngestBatchRequest>;
export type IngestBatchResponse = z.infer<typeof IngestBatchResponse>;
export type HealthStatus = z.infer<typeof HealthStatus>;
