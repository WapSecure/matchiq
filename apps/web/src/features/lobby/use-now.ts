'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 30_000;

/** Wall-clock time that refreshes on a slow tick, so "12 min ago" stays true. */
export const useNow = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
};
