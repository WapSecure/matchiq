'use client';

import { useEffect, useRef, useState } from 'react';
import { ANNOUNCE_THROTTLE_MS } from '@/constants/studio';

/**
 * Throttles screen-reader announcements: at most one per window, and the
 * latest pending message wins so bursts at 30x do not flood the live region.
 */
export const useThrottledAnnouncement = (
  message: string | null,
  throttleMs: number = ANNOUNCE_THROTTLE_MS,
): string => {
  const [spoken, setSpoken] = useState('');
  const lastAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    const wait = Math.max(0, lastAt.current + throttleMs - Date.now());
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastAt.current = Date.now();
      setSpoken(message);
      timer.current = null;
    }, wait);
  }, [message, throttleMs]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return spoken;
};
