import type { OverlayCue } from '@matchiq/contracts';
import { CUE_MIN_DWELL_MS } from '@/constants/overlay';

export type OnAir = {
  cue: OverlayCue | null;
  /** Wall-clock ms when this overlay first went on air. */
  shownAt: number;
  /** True while the cue is shown only because of the minimum dwell. */
  held: boolean;
};

export const OFF_AIR: OnAir = { cue: null, shownAt: 0, held: false };

export type DwellInput = {
  /** Highest-priority cue on air at the current match clock, if any. */
  candidate: OverlayCue | null;
  /** True when the shown cue was pulled (not merely expired). */
  pulled: (overlayId: string) => boolean;
  now: number;
  dwellMs?: number;
};

/**
 * Decides what the preview shows. A new cue always replaces the shown one:
 * the worker only publishes a second cue after the first ended or to
 * supersede it with a higher priority. When the match clock leaves a cue's
 * window, it stays up until it has been on air for `dwellMs` of real time,
 * unless it was retracted.
 */
export const nextOnAir = (
  current: OnAir,
  { candidate, pulled, now, dwellMs = CUE_MIN_DWELL_MS }: DwellInput,
): OnAir => {
  if (candidate) {
    const same = current.cue?.overlayId === candidate.overlayId;
    return {
      cue: candidate,
      shownAt: same ? current.shownAt : now,
      held: false,
    };
  }
  if (!current.cue || pulled(current.cue.overlayId)) return OFF_AIR;
  if (now - current.shownAt >= dwellMs) return OFF_AIR;
  return { ...current, held: true };
};

/** Real-time ms until a held cue must be re-evaluated, or null. */
export const dwellRemaining = (
  state: OnAir,
  now: number,
  dwellMs: number = CUE_MIN_DWELL_MS,
): number | null =>
  state.cue ? Math.max(0, state.shownAt + dwellMs - now) : null;
