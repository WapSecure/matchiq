import { Permission, Role } from '@matchiq/access';
import { z } from 'zod';

export const SessionViewUser = z.object({
  sub: z.string(),
  name: z.string(),
  orgId: z.string(),
  orgName: z.string().optional(),
  roles: z.array(Role),
});

/** `GET /auth/session`: what the browser may know about the session (no tokens). */
export const SessionView = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('authenticated'),
    ssoEnabled: z.literal(true),
    user: SessionViewUser,
    permissions: z.array(Permission),
  }),
  z.object({
    status: z.enum(['anonymous', 'expired']),
    ssoEnabled: z.boolean(),
  }),
]);

export type SessionViewUser = z.infer<typeof SessionViewUser>;
export type SessionView = z.infer<typeof SessionView>;
