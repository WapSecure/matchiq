import { ReplaySpeed } from '@matchiq/contracts';
import { z } from 'zod';
import { API_LIMITS } from '../constants';

export const CreateSessionBody = z.strictObject({ speed: ReplaySpeed });

export const SessionListQuery = z.strictObject({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(API_LIMITS.sessionListMax)
    .default(API_LIMITS.sessionListDefault),
});

export type CreateSessionBody = z.infer<typeof CreateSessionBody>;
export type SessionListQuery = z.infer<typeof SessionListQuery>;
