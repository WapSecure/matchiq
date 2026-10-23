import { z } from 'zod';
import { OrgId, UtcTimestamp } from './primitives.js';

/** `POST /fixtures/{id}/stream-tickets`: opens that fixture's stream with `?ticket=` (ADR-0018). */
export const StreamTicket = z.strictObject({
  ticket: z.string().min(1),
  expiresAt: UtcTimestamp,
});

/** `GET /me`: the caller as the API sees it; roles and permissions are display hints. */
export const AccessProfile = z.strictObject({
  kind: z.enum(['user', 'service', 'anonymous', 'operator-key']),
  userId: z.string().min(1),
  orgId: OrgId,
  orgName: z.string().nullable(),
  displayName: z.string().nullable(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export type StreamTicket = z.infer<typeof StreamTicket>;
export type AccessProfile = z.infer<typeof AccessProfile>;
