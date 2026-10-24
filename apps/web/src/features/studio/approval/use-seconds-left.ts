'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 1_000;

const secondsUntil = (target: number | null, offsetMs: number) =>
  target === null
    ? null
    : Math.max(0, Math.ceil((target - Date.now() - offsetMs) / TICK_MS));

/**
 * Whole seconds until a wall-clock deadline, or null without one. `offsetMs`
 * is the server clock minus the browser clock, so a wrong device clock does
 * not shorten or stretch the producer's window.
 */
export const useSecondsLeft = (
  deadline: string | null,
  offsetMs: number,
): number | null => {
  const target = deadline === null ? null : Date.parse(deadline);
  const [left, setLeft] = useState(() => secondsUntil(target, offsetMs));
  useEffect(() => {
    setLeft(secondsUntil(target, offsetMs));
    const timer = setInterval(
      () => setLeft(secondsUntil(target, offsetMs)),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [target, offsetMs]);
  return left;
};
