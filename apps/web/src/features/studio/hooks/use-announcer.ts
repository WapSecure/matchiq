'use client';

import type { Locale } from '@matchiq/contracts';
import { useEffect, useRef, useState } from 'react';
import { ANNOUNCE_THROTTLE_MS } from '@/constants/studio';

export type Announcement = { text: string; locale: Locale };

export const useThrottledAnnouncement = (
  message: Announcement | null,
  throttleMs: number = ANNOUNCE_THROTTLE_MS,
): Announcement | null => {
  const [spoken, setSpoken] = useState<Announcement | null>(null);
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    if (!message) return undefined;
    const wait =
      lastAt.current === null
        ? 0
        : Math.max(0, lastAt.current + throttleMs - Date.now());
    const timer = setTimeout(() => {
      lastAt.current = Date.now();
      setSpoken(message);
    }, wait);
    return () => clearTimeout(timer);
  }, [message, throttleMs]);

  return message ? spoken : null;
};
