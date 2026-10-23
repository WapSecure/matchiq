import {
  CreateReplaySession,
  CursorPageQuery,
  FaultPlan,
  Fixture,
  FixtureId,
  ReplayStatus,
  UtcTimestamp,
} from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS } from '../constants';

export const CreateSessionBody = CreateReplaySession;

export const SessionListQuery = CursorPageQuery(
  API_LIMITS.sessionListDefault,
  API_LIMITS.sessionListMax,
);

export const TemplateListQuery = CursorPageQuery(
  API_LIMITS.templateListDefault,
  API_LIMITS.templateListMax,
);

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
export type TemplateListQuery = z.infer<typeof TemplateListQuery>;
