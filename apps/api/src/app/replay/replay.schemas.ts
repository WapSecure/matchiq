import {
  CreateReplaySession,
  FaultPlan,
  Fixture,
  FixtureId,
  ReplayStatus,
  UtcTimestamp,
} from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS } from '../constants';

export const CreateSessionBody = CreateReplaySession;

export const SessionListQuery = z.strictObject({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(API_LIMITS.sessionListMax)
    .default(API_LIMITS.sessionListDefault),
});

/** Re-validates a stored `201` before an idempotent replay returns it. */
export const CreatedSessionResponse = z.strictObject({
  fixture: Fixture,
  session: z.strictObject({
    sessionId: FixtureId,
    templateId: FixtureId,
    sessionNumber: z.int().positive(),
    title: z.string().min(1),
    status: ReplayStatus,
    createdAt: UtcTimestamp,
    updatedAt: UtcTimestamp,
    faultPlan: FaultPlan.optional(),
  }),
});

export type CreateSessionBody = z.infer<typeof CreateSessionBody>;
export type SessionListQuery = z.infer<typeof SessionListQuery>;
