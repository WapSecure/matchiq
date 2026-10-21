'use client';

import type { Locale, Persona } from '@matchiq/contracts';
import { useEffect, useRef, useState } from 'react';
import { CUE_HOLD_MS, NATURAL_CUE_ENDS } from '@/constants/overlay';
import {
  dwellRemaining,
  nextOnAir,
  OFF_AIR,
  type OnAir,
} from '../lib/cue-dwell';
import { selectActiveCues, useMatchStore, useStudioUi } from '../store';
import type { OverlayEntry } from '../store';

const isPulled = (entry: OverlayEntry | undefined): boolean =>
  Boolean(entry?.retracted && !NATURAL_CUE_ENDS.has(entry.retracted.reason));

/** The cue the preview shows, held for a minimum real-time dwell. */
export const useOnAirCue = (persona: Persona, locale: Locale): OnAir => {
  const candidate = useMatchStore(
    (s) => selectActiveCues(s, persona, locale)[0] ?? null,
  );
  const overlays = useMatchStore((s) => s.overlays);
  const dwellMs = CUE_HOLD_MS[useStudioUi((s) => s.cueHold)];
  const [onAir, setOnAir] = useState<OnAir>(OFF_AIR);
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOnAir((prev) =>
      nextOnAir(prev, {
        candidate,
        pulled: (id) => isPulled(overlays[id]),
        now: Date.now(),
        dwellMs,
      }),
    );
  }, [candidate, overlays, tick, dwellMs]);

  useEffect(() => {
    const remaining = onAir.held
      ? dwellRemaining(onAir, Date.now(), dwellMs)
      : null;
    if (remaining === null) return undefined;
    timer.current = setTimeout(() => setTick((t) => t + 1), remaining);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [onAir, dwellMs]);

  return onAir;
};
