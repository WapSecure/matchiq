'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 1_000;

/** Whole seconds left from `seconds`; restarts whenever `seconds` or `key` changes. */
export const useCountdown = (seconds: number | null, key?: unknown): number => {
  const [left, setLeft] = useState(seconds ?? 0);
  useEffect(() => {
    setLeft(seconds ?? 0);
    if (!seconds) return undefined;
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        seconds - Math.floor((Date.now() - started) / TICK_MS),
      );
      setLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [seconds, key]);
  return left;
};
