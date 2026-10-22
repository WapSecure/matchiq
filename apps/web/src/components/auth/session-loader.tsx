'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/auth/session-store';

/**
 * Loads `/auth/session` once per page load. API calls wait for it
 * (`whenSessionKnown`), so a signed-in user's requests use the BFF.
 */
export function SessionLoader() {
  const load = useSession((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return null;
}
