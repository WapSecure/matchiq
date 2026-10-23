'use client';

import { API_LIMITS } from '@/constants/api';
import { useSessionsPage } from '@/lib/api/hooks';
import type { InstantRange } from '@/lib/date-time';

/**
 * Audit rows carry wall-clock times, so "This match" is the replay session's
 * lifetime: from its creation to its last update once complete, else to now.
 */
export const useMatchWindow = (fixtureId: string): InstantRange | null => {
  const sessions = useSessionsPage({ limit: API_LIMITS.sessionLookupMax });
  const session = sessions.data?.items.find(
    (s) => s.status.fixtureId === fixtureId,
  );
  if (!session) return null;
  const done = session.status.state === 'COMPLETED';
  return {
    start: session.createdAt,
    end: done ? session.updatedAt : new Date().toISOString(),
  };
};
