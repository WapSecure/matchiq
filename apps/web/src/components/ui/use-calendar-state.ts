'use client';

import type { CalendarDate } from '@internationalized/date';
import {
  type ContextType,
  type RefObject,
  useContext,
  useEffect,
  useRef,
} from 'react';
import {
  CalendarStateContext,
  RangeCalendarStateContext,
} from 'react-aria-components';

export type AnyCalendarState =
  | NonNullable<ContextType<typeof CalendarStateContext>>
  | NonNullable<ContextType<typeof RangeCalendarStateContext>>;

/** The state of whichever calendar (single or range) this component sits in. */
export function useAnyCalendarState(): AnyCalendarState {
  const single = useContext(CalendarStateContext);
  const range = useContext(RangeCalendarStateContext);
  const state = single ?? range;
  if (!state) throw new Error('Calendar parts must render inside a calendar.');
  return state;
}

const SHIFT_PX = 12;
const DURATION_MS = 180;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Slides the grids in from the side the month came from; skipped under reduced motion. */
export function useMonthMotion(
  ref: RefObject<HTMLElement | null>,
  start: CalendarDate,
) {
  const previous = useRef(start);
  useEffect(() => {
    const before = previous.current;
    previous.current = start;
    const el = ref.current;
    const delta = start.compare(before);
    if (!el || delta === 0 || !el.animate) return;
    if (window.matchMedia?.(REDUCED_MOTION).matches) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    const from = Math.sign(delta) * SHIFT_PX * rtl;
    el.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DURATION_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }, [ref, start]);
}
