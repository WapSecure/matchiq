'use client';

import { useSessions } from '@/lib/api/hooks';
import type { InstantRange } from '@/lib/date-time';

/**
 * Audit rows carry wall-clock times, so "This match" is the replay session's
 * lifetime: from its creation to its last update once complete, else to now.
 */
export const useMatchWindow = (fixtureId: string): InstantRange | null => {
  const sessions = useSessions();
  const session = sessions.data?.find((s) => s.status.fixtureId === fixtureId);
  if (!session) return null;
  const done = session.status.state === 'COMPLETED';
  return {
    start: session.createdAt,
    end: done ? session.updatedAt : new Date().toISOString(),
  };
};
